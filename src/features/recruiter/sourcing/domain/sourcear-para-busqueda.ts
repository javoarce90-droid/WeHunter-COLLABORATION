import type {
  ScoreApplicationInput,
  ScoreApplicationsBatchInput,
  ScoredCandidate,
  ScoreBreakdown,
} from "@/lib/ai/provider";
import { normalizeEmailKey, normalizeLinkedinKey } from "../../candidates/domain/duplicate-keys";
import type {
  SourcingFilters,
  SourcingProviderCandidate,
  SourcingProviderResult,
} from "./sourcing-provider";
import type { SourcingConsumptionEventType } from "./sourcing-consumption-event";

/** Contexto mínimo de la búsqueda para armar los filtros y scorear a los candidatos. */
export type JobSourcingContext = {
  title: string;
  position: string | null;
  skills: string[] | null;
  seniority: string | null;
  location: string | null;
  objectives?: string | null;
  requirements?: string | null;
  responsibilities?: string | null;
};

/** Tope de resultados pedidos por el cliente (ítem 9.4). También el techo del selector de
 *  cantidad en la UI (design.md §1.1 — el reclutador elige de antemano cuántos quiere). */
export const SOURCING_MAX_RESULTS = 10;

export type ScoredLinkedInCandidate = SourcingProviderCandidate & {
  score: number;
  summary: string;
  breakdown: ScoreBreakdown;
  strengths: string[];
  redFlags: string[];
};

/** Candidato que matcheó contra el Talent Pool (por linkedinUrl o email) — spec funcional
 *  "Detección de duplicado contra el Talent Pool": consume crédito igual que uno nuevo, pero
 *  NO se scorea con IA (el reclutador ya tiene una decisión tomada sobre este candidato). Se
 *  muestra marcado, con un link al candidato existente (`existingCandidateId`). */
export type DuplicateLinkedInCandidate = SourcingProviderCandidate & {
  existingCandidateId: string;
};

export type SourcearParaBusquedaDeps = {
  search: (
    filters: SourcingFilters,
    maxResults: number,
    exclude: string[],
  ) => Promise<SourcingProviderResult>;
  /** Scoring en lote: se usa para la tanda de sourcing (todos los candidatos nuevos de una). */
  scoreApplicationsBatch: (
    input: ScoreApplicationsBatchInput,
  ) => Promise<ScoredCandidate[]>;
  /** Qué linkedinUrls/emails del lote ya están en el pool de la organización — se usa para no
   *  volver a mostrar (ni gastar un scoring de IA en) un candidato que el recruiter ya tiene
   *  cargado, matcheando por cualquiera de las dos claves (regla "Duplicados" ampliada a email,
   *  ver `limitar-sourcing-ia` y `integrar-harvestapi-sourcing/design.md` §8). El consumo de
   *  crédito por esos perfiles igual se cuenta — esto solo afecta qué se muestra como
   *  resultado, no el cobro. */
  findExistingCandidateKeys: (args: {
    linkedinUrls: string[];
    emails: string[];
  }) => Promise<{ linkedinUrls: Map<string, string>; emails: Map<string, string> }>;
  /** Emite un evento de consumo por cada perfil obtenido — seam hacia el sistema de créditos de
   *  `limitar-sourcing-ia` (`sourcing-consumption-event.ts`). No decide si se cobra o no, solo
   *  registra; el costo de la llamada se prorratea en partes iguales entre los candidatos
   *  devueltos (`SourcingProviderResult.costUsd` no viene desglosado por candidato). */
  recordConsumption: (event: {
    candidateKey: string;
    type: SourcingConsumptionEventType;
    costUsd: number;
    provider: string;
  }) => Promise<void>;
  /** Caché de perfiles ya obtenidos del proveedor (control interno "no pagar dos veces",
   *  design.md §6.2) — devuelve el perfil cacheado si hay una fila vigente (dentro del TTL)
   *  para esa `linkedinUrl` en esta organización, o `null`. NUNCA se consulta para un
   *  candidato que ya matcheó como duplicado del Talent Pool (ese siempre es `DUPLICATE`,
   *  sin importar la caché). */
  findCachedProfile: (linkedinUrl: string) => Promise<SourcingProviderCandidate | null>;
  /** Refresca la caché con el payload actual del candidato — se llama para todo candidato
   *  procesado que no sea un duplicado del pool, esté o no ya cacheado. */
  cacheProfile: (candidate: SourcingProviderCandidate) => Promise<void>;
};

/** Mapea un candidato del proveedor al contrato de scoring — incluye experience/education
 *  reales (HarvestAPI los trae completos, `candidateBlock()` en `src/lib/ai/prompts.ts` ya sabe
 *  formatearlos si vienen poblados). Se pierden `startDate`/`endDate`, el prompt no los usa. */
export function linkedInToScoreCandidate(
  c: SourcingProviderCandidate,
): ScoreApplicationInput["candidate"] {
  return {
    id: c.id,
    skills: c.skills,
    summary: c.snippet ?? c.headline,
    source: "linkedin",
    experience: c.experience.map((e) => ({
      position: e.position,
      company: e.company,
      description: e.description,
    })),
    education: c.education.map((e) => ({
      degree: e.degree,
      institution: e.institution,
      fieldOfStudy: e.fieldOfStudy,
    })),
  };
}

/** De los perfiles que devolvió el proveedor en esta búsqueda: cuántos en total
 *  (`encontrados`), cuántos ya estaban en el pool (`enPool`, filtrados antes de scorear — pero
 *  igual consumen crédito, ver nota de `findExistingCandidateKeys`) y cuántos son
 *  genuinamente nuevos (`nuevos`). Siempre `encontrados = enPool + nuevos`. */
export type SourcingMetrics = {
  encontrados: number;
  enPool: number;
  nuevos: number;
};

/** Default de ubicación cuando la búsqueda no la tiene cargada: sin esto, el filtro de
 *  ubicación quedaría vacío y el proveedor devolvería perfiles de cualquier país. */
const DEFAULT_SOURCING_LOCATION = "Argentina";

/** Arma los filtros estructurados de sourcing a partir del contexto de la búsqueda (puesto,
 *  skills, seniority, ubicación) — sin que el reclutador tenga que tipear nada. Cada
 *  `SourcingProvider` decide cómo usar estos filtros (`SerperProvider` los aplana a texto
 *  libre para su X-Ray; HarvestAPI los manda como filtros server-side reales — ver
 *  `openspec/changes/integrar-harvestapi-sourcing/specs/sourcing-provider/spec.md`, requisito
 *  "Filtros estructurados, no texto libre tipo X-Ray"). */
export function jobToSourcingFilters(job: JobSourcingContext): SourcingFilters {
  return {
    // `job.title` (el nombre de la publicación), no `job.position` — `position` es el "rol
    // canónico" que usa el scoring de IA (ver `jobToScoreJob`, que lee el job directo, no pasa
    // por acá) pero puede tener redacción libre que no matchea cómo la gente escribe su
    // puesto en LinkedIn (ej. "Product Designer Senior", orden invertido) — confirmado como
    // causa real de 0 resultados en una búsqueda real (2026-09-15). `role` acá SOLO alimenta
    // la query de los proveedores de búsqueda (Serper/HarvestAPI), nunca el scoring.
    role: job.title.trim(),
    skills: job.skills ?? [],
    seniority: job.seniority,
    location: job.location?.trim() || DEFAULT_SOURCING_LOCATION,
  };
}

/** Scorea candidatos de LinkedIn contra una búsqueda con IA (mismo contrato que
 *  `puntuar-postulaciones.ts`). */
const jobToScoreJob = (job: JobSourcingContext): ScoreApplicationInput["job"] => ({
  title: job.title,
  position: job.position,
  skills: job.skills,
  objectives: job.objectives,
  requirements: job.requirements,
  responsibilities: job.responsibilities,
});

export type SourcearParaBusquedaResult =
  | {
      ok: true;
      /** Candidatos nuevos (no en el pool), scoreados y ordenados por match — hasta
       *  `maxResults`. */
      results: ScoredLinkedInCandidate[];
      /** Candidatos que matchearon contra el Talent Pool — se muestran marcados con link, no se
       *  scorean (spec "Detección de duplicado contra el Talent Pool"). Ya consumieron crédito
       *  (contados en `metrics.enPool`), esto es solo para que la UI los liste. */
      duplicates: DuplicateLinkedInCandidate[];
      isLiveApi: boolean;
      metrics: SourcingMetrics;
    }
  | { ok: false; error: string };

/**
 * Busca candidatos para una búsqueda en LinkedIn y los scorea con IA, en UNA sola llamada de
 * punta a punta — un solo round-trip desde el navegador (decisión de producto 2026-09-17: se
 * había evaluado partir "buscar" de "scorear" en 2 pasos con selección manual, pero se volvió
 * atrás — el reclutador prefiere ver todo scoreado de una). Ya no existe "Buscar más
 * candidatos" (cambio de producto 2026-09-14, ver
 * `openspec/changes/integrar-harvestapi-sourcing/design.md` §1.1). El reclutador elige de
 * antemano cuántos candidatos quiere (`maxResults`, 1 a `SOURCING_MAX_RESULTS`) y el sistema
 * los trae de una vez. Los candidatos ya en el Talent Pool se filtran del listado que se
 * muestra (no se scorean de nuevo) pero siguen contando para el consumo de crédito — eso lo
 * maneja quien llama, no esta función. Scorea a los nuevos con IA en una sola llamada (lote).
 * No filtra por score — el recruiter decide mirando el %.
 */
export async function sourcearParaBusqueda(
  job: JobSourcingContext,
  maxResults: number,
  deps: SourcearParaBusquedaDeps,
): Promise<SourcearParaBusquedaResult> {
  const filters = jobToSourcingFilters(job);
  const res = await deps.search(filters, maxResults, []);
  if (res.error) {
    await deps.recordConsumption({
      candidateKey: "(search)",
      type: "FAILED",
      costUsd: 0,
      provider: res.provider,
    });
    return { ok: false, error: res.error };
  }

  if (res.candidates.length === 0) {
    return {
      ok: true,
      results: [],
      duplicates: [],
      isLiveApi: res.isLiveApi,
      metrics: { encontrados: 0, enPool: 0, nuevos: 0 },
    };
  }

  const existing = await deps.findExistingCandidateKeys({
    linkedinUrls: res.candidates.map((c) => c.linkedinUrl),
    emails: res.candidates.map((c) => c.email).filter((e): e is string => Boolean(e)),
  });
  const perCandidateCost = res.costUsd / res.candidates.length;
  const nuevos: SourcingProviderCandidate[] = [];
  const duplicates: DuplicateLinkedInCandidate[] = [];
  let enPool = 0;
  for (const c of res.candidates) {
    const urlKey = normalizeLinkedinKey(c.linkedinUrl);
    const emailKey = normalizeEmailKey(c.email);
    const existingCandidateId =
      (urlKey !== null ? existing.linkedinUrls.get(urlKey) : undefined) ??
      (emailKey !== null ? existing.emails.get(emailKey) : undefined);
    if (existingCandidateId) {
      // Un fallo puntual de Supabase al auditar/cobrar este candidato no debe perder un
      // resultado real de búsqueda — se muestra igual, marcado como duplicado.
      try {
        await deps.recordConsumption({
          candidateKey: urlKey ?? c.id,
          type: "DUPLICATE",
          costUsd: perCandidateCost,
          provider: res.provider,
        });
      } catch {
        // no-op, ver comentario arriba.
      }
      enPool += 1;
      // Spec "Detección de duplicado contra el Talent Pool": se cobra Y se muestra marcado con
      // link al candidato existente — nunca se descarta en silencio.
      duplicates.push({ ...c, existingCandidateId });
      continue;
    }
    // No es un duplicado del pool — puede igual ser un perfil que esta org ya obtuvo antes
    // (otra búsqueda, otro recruiter): si está cacheado y vigente, no se le cobra crédito al
    // cliente aunque HarvestAPI haya facturado igual el perfil dentro de esta búsqueda (el
    // costo lo absorbe WeHunter — design.md §6.2). Mismo criterio de resiliencia que arriba: un
    // fallo puntual acá no debe perder el candidato de los resultados.
    try {
      const cached = await deps.findCachedProfile(c.linkedinUrl);
      await deps.recordConsumption({
        candidateKey: urlKey ?? c.id,
        type: cached ? "REUSED_PROFILE" : "NEW_PROFILE",
        costUsd: perCandidateCost,
        provider: res.provider,
      });
      await deps.cacheProfile(c);
    } catch {
      // no-op, ver comentario arriba.
    }
    nuevos.push(c);
  }

  // Una sola llamada a la IA para todos los nuevos de esta búsqueda.
  const batch =
    nuevos.length > 0
      ? await deps.scoreApplicationsBatch({
          job: jobToScoreJob(job),
          candidates: nuevos.map(linkedInToScoreCandidate),
        })
      : [];
  const scoreById = new Map(batch.map((r) => [r.candidateId, r]));
  const results: ScoredLinkedInCandidate[] = nuevos
    .map((c) => {
      const r = scoreById.get(c.id)!; // scoreApplicationsBatch cubre todos los pedidos
      return {
        ...c,
        score: r.score,
        summary: r.summary,
        breakdown: r.breakdown,
        strengths: r.strengths,
        redFlags: r.redFlags,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return {
    ok: true,
    results,
    duplicates,
    isLiveApi: res.isLiveApi,
    metrics: { encontrados: res.candidates.length, enPool, nuevos: nuevos.length },
  };
}
