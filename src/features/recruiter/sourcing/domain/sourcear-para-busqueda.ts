import type {
  ScoreApplicationInput,
  ScoreApplicationResult,
  ScoreApplicationsBatchInput,
  ScoredCandidate,
  ScoreBreakdown,
} from "@/lib/ai/provider";
import { normalizeLinkedinKey } from "../../candidates/domain/duplicate-keys";
import type { LinkedInCandidateResult } from "./linkedin-search";

/** Contexto mínimo de la búsqueda para armar la query y scorear a los candidatos. */
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

/** Tope de resultados pedidos por el cliente (ítem 9.4). */
export const SOURCING_MAX_RESULTS = 10;

/** Tope de candidatos scoreados automáticamente por tanda en Sourcing Manual (guardrail contra
 *  abuso — cada score es una llamada real a la IA). Coincide con SOURCING_MAX_RESULTS, así que
 *  el freno real de hoy es "una vez por par candidato+búsqueda"; este tope queda como techo
 *  explícito por si el máximo de resultados cambia. */
export const SOURCING_MANUAL_SCORE_CAP = 10;

export type ScoredLinkedInCandidate = LinkedInCandidateResult & {
  score: number;
  summary: string;
  breakdown: ScoreBreakdown;
  strengths: string[];
  redFlags: string[];
};

export type SourcearParaBusquedaDeps = {
  search: (
    query: string,
  ) => Promise<{
    candidates: LinkedInCandidateResult[];
    isLiveApi: boolean;
    error?: string;
  }>;
  scoreApplication: (
    input: ScoreApplicationInput,
  ) => Promise<ScoreApplicationResult>;
  /** Scoring en lote: se usa para la tanda de sourcing (todos los candidatos nuevos de una). */
  scoreApplicationsBatch: (
    input: ScoreApplicationsBatchInput,
  ) => Promise<ScoredCandidate[]>;
  /** Qué linkedinUrls del lote ya están en el pool de la organización — se usa para no volver a
   *  mostrar (ni gastar un scoring de IA en) un candidato que el recruiter ya tiene cargado. */
  findExistingLinkedinUrls: (linkedinUrls: string[]) => Promise<Set<string>>;
};

/** Mapea un candidato de LinkedIn (solo snippet, sin experiencia/educación estructurada) al
 *  contrato de scoring. El candidato arma su perfil completo recién si se importa al pool. */
export function linkedInToScoreCandidate(
  c: LinkedInCandidateResult,
): ScoreApplicationInput["candidate"] {
  return {
    id: c.id,
    skills: c.skills,
    summary: c.snippet ?? c.headline,
    source: "linkedin",
    experience: [],
    education: [],
  };
}

/** Transparencia de una tanda: cuántos trajo Serper, cuántos ya estaban en el pool (filtrados
 *  antes de scorear) y cuántos son realmente nuevos — para que la UI pueda explicar por qué una
 *  tanda "encontró 10" pero solo muestra 3. */
export type SourcingMetrics = {
  encontrados: number;
  enPool: number;
  nuevos: number;
};

/** Tope de skills que se suman al query de sourcing (ítem backlog ago 2026): mandar todos los
 *  skills como términos obligatorios angosta demasiado la búsqueda en X-Ray (Google trata cada
 *  palabra como un AND) y puede devolver cero resultados reales para roles no técnicos cuyos
 *  skills mencionan tecnología de contexto (ej. una búsqueda de Recruiter que sabe reclutar
 *  perfiles IT). El puesto real sigue siendo el ancla principal del query. */
const MAX_SOURCING_QUERY_SKILLS = 3;

/** Cuántas variantes de query distintas se prueban en sucesivos "Buscar más candidatos" para la
 *  misma búsqueda, antes de asentarse en la más amplia (attempts fuera de rango clampan acá). */
export const SOURCING_MAX_QUERY_ATTEMPTS = 4;

/** Arma una variante de la query de sourcing según el intento (0 = la de siempre, la que arma
 *  `buildJobSourcingQuery`). Cada término de la query es un AND en el X-Ray search de Serper —
 *  sacar un término AMPLÍA resultados, nunca los achica — así que las variantes van de más
 *  precisa a más amplia dropeando términos, nunca el puesto (ancla mínima de negocio: sin eso la
 *  búsqueda deja de tener sentido). Existe porque Serper no soporta paginación — pedir de nuevo
 *  la misma query devuelve siempre el mismo top-10 — así que ampliar la query es la única
 *  palanca real para que "Buscar más candidatos" tenga chance de traer perfiles distintos. */
export function buildJobSourcingQueryVariant(job: JobSourcingContext, attempt: number): string {
  const clamped = Math.max(0, Math.min(attempt, SOURCING_MAX_QUERY_ATTEMPTS - 1));
  const anchor = job.position?.trim() || job.title.trim() || null;
  const allSkills = job.skills ?? [];
  const hasSkillWindow = allSkills.length > MAX_SOURCING_QUERY_SKILLS;

  // El intento 1 (siguiente bloque de skills) solo tiene sentido si hay un segundo bloque real —
  // si no, colapsa directo al intento 2 (dropear seniority) en vez de repetir el intento 0.
  const effectiveAttempt = clamped === 1 && !hasSkillWindow ? 2 : clamped;

  const skills =
    effectiveAttempt === 1
      ? allSkills.slice(MAX_SOURCING_QUERY_SKILLS, MAX_SOURCING_QUERY_SKILLS * 2)
      : allSkills.slice(0, MAX_SOURCING_QUERY_SKILLS);

  const terms = [
    anchor,
    ...skills,
    effectiveAttempt <= 1 ? job.seniority : null,
    effectiveAttempt <= 2 ? job.location : null,
  ].filter((t): t is string => Boolean(t && t.trim()));

  return terms.join(" ");
}

/** Arma el texto libre de búsqueda a partir del puesto real (o el título), skills, seniority
 *  y ubicación de la búsqueda — sin que el recruiter tenga que tipear nada. */
export function buildJobSourcingQuery(job: JobSourcingContext): string {
  return buildJobSourcingQueryVariant(job, 0);
}

/** Scorea un candidato de LinkedIn contra una búsqueda con IA (mismo contrato que
 *  `puntuar-postulaciones.ts`). Función pura reusada tanto por `sourcearParaBusqueda` (lote,
 *  Sourcing con IA) como por el scoring puntual de Sourcing Manual (un candidato a la vez). */
const jobToScoreJob = (job: JobSourcingContext): ScoreApplicationInput["job"] => ({
  title: job.title,
  position: job.position,
  skills: job.skills,
  objectives: job.objectives,
  requirements: job.requirements,
  responsibilities: job.responsibilities,
});

export async function scoreLinkedInCandidate(
  candidate: LinkedInCandidateResult,
  job: JobSourcingContext,
  scoreApplication: SourcearParaBusquedaDeps["scoreApplication"],
): Promise<ScoredLinkedInCandidate> {
  const result = await scoreApplication({
    candidate: linkedInToScoreCandidate(candidate),
    job: jobToScoreJob(job),
  });
  return {
    ...candidate,
    score: result.score,
    summary: result.summary,
    breakdown: result.breakdown,
    strengths: result.strengths,
    redFlags: result.redFlags,
  };
}

/**
 * Busca candidatos en LinkedIn para una búsqueda puntual (variando la query según `attempt`,
 * ver `buildJobSourcingQueryVariant`), descarta los que ya están en el pool de la organización
 * y scorea con IA solo a los nuevos. Devuelve todos los que quedan (sin filtrar por score — el
 * recruiter decide mirando el % de cada uno), ordenados de mayor a menor compatibilidad, hasta
 * 10, junto con las métricas de la tanda (para que la UI explique cuántos se filtraron).
 */
export async function sourcearParaBusqueda(
  job: JobSourcingContext,
  deps: SourcearParaBusquedaDeps,
  attempt = 0,
): Promise<
  | { ok: true; results: ScoredLinkedInCandidate[]; isLiveApi: boolean; metrics: SourcingMetrics }
  | { ok: false; error: string }
> {
  const query = buildJobSourcingQueryVariant(job, attempt);
  const { candidates, isLiveApi, error } = await deps.search(query);
  if (error) return { ok: false, error };

  const existing =
    candidates.length > 0
      ? await deps.findExistingLinkedinUrls(candidates.map((c) => c.linkedinUrl))
      : new Set<string>();
  const nuevos = candidates.filter((c) => !existing.has(normalizeLinkedinKey(c.linkedinUrl) ?? ""));

  // Una sola llamada a la IA para toda la tanda, en vez de una por candidato.
  const batch =
    nuevos.length > 0
      ? await deps.scoreApplicationsBatch({
          job: jobToScoreJob(job),
          candidates: nuevos.map(linkedInToScoreCandidate),
        })
      : [];
  const scoreById = new Map(batch.map((r) => [r.candidateId, r]));
  const scored: ScoredLinkedInCandidate[] = nuevos.map((c) => {
    const r = scoreById.get(c.id)!; // scoreApplicationsBatch cubre todos los candidatos pedidos.
    return {
      ...c,
      score: r.score,
      summary: r.summary,
      breakdown: r.breakdown,
      strengths: r.strengths,
      redFlags: r.redFlags,
    };
  });

  const results = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, SOURCING_MAX_RESULTS);

  return {
    ok: true,
    results,
    isLiveApi,
    metrics: {
      encontrados: candidates.length,
      enPool: candidates.length - nuevos.length,
      nuevos: nuevos.length,
    },
  };
}

/** Suma una tanda nueva ("Buscar más candidatos") a los resultados ya mostrados, sin duplicar
 *  por `linkedinUrl` normalizado (o `id` si no hay linkedinUrl comparable en algún lado). La usa
 *  tanto el cliente (lo que pinta en pantalla) como la server action (lo que persiste en
 *  `sourcing_search_sessions`) — un solo lugar para que ambos coincidan siempre. */
export function mergeSourcingBatch(
  previous: ScoredLinkedInCandidate[],
  incoming: ScoredLinkedInCandidate[],
): ScoredLinkedInCandidate[] {
  const yaVistos = new Set(previous.map((c) => normalizeLinkedinKey(c.linkedinUrl) ?? c.id));
  const nuevos = incoming.filter((c) => !yaVistos.has(normalizeLinkedinKey(c.linkedinUrl) ?? c.id));
  return [...previous, ...nuevos];
}
