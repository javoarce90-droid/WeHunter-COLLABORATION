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
    page: number,
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

/** Transparencia de un click de "Buscar más": de los perfiles que NO se habían mostrado antes,
 *  cuántos aparecieron (`encontrados`), cuántos ya estaban en el pool (`enPool`, filtrados antes
 *  de scorear) y cuántos son realmente nuevos (`nuevos`). Siempre `encontrados = enPool + nuevos`.
 *  Los perfiles ya mostrados en clicks anteriores no cuentan en ninguno. */
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

/** Cuántas variantes de query distintas se prueban para la misma búsqueda, de más precisa a más
 *  amplia. Combinadas con la paginación de Serper (ver `SEARCH_PAGES_PER_VARIANT`) definen el
 *  universo de perfiles que "Buscar más candidatos" puede recorrer. */
export const SOURCING_MAX_QUERY_ATTEMPTS = 4;

/** Cuántas páginas de Serper se piden por variante de query antes de pasar a la siguiente
 *  variante. 4 variantes × 3 páginas × 10 resultados = hasta 120 perfiles distintos por búsqueda. */
export const SEARCH_PAGES_PER_VARIANT = 3;

/** Total de "pasos" de búsqueda: cada paso es un par (variante, página) único. Cuando el cursor
 *  llega acá, no queda nada más que probar (`exhausted`). */
export const MAX_SEARCH_STEPS = SOURCING_MAX_QUERY_ATTEMPTS * SEARCH_PAGES_PER_VARIANT;

/** Tope de páginas de Serper que consume UN click de "Buscar más candidatos" mientras junta
 *  perfiles nuevos — freno de latencia/costo (búsqueda + hasta 10 scorings de IA por click). */
export const MAX_STEPS_PER_CLICK = 5;

/** Traduce un paso del cursor a (variante de query, página de Serper). Los pasos van llenando
 *  las páginas de la variante 0, después las de la 1, etc. Fuera de rango clampa a la última
 *  variante / a `MAX_SEARCH_STEPS`. */
export function stepToVariantPage(step: number): { variant: number; page: number } {
  const s = Math.max(0, Math.min(step, MAX_SEARCH_STEPS - 1));
  return {
    variant: Math.floor(s / SEARCH_PAGES_PER_VARIANT),
    page: (s % SEARCH_PAGES_PER_VARIANT) + 1,
  };
}

/** Arma una variante de la query de sourcing según el intento (0 = la de siempre, la que arma
 *  `buildJobSourcingQuery`). Cada término de la query es un AND en el X-Ray search de Serper —
 *  sacar un término AMPLÍA resultados, nunca los achica — así que las variantes van de más
 *  precisa a más amplia dropeando términos, nunca el puesto (ancla mínima de negocio: sin eso la
 *  búsqueda deja de tener sentido). Combinado con la paginación, cada variante aporta varias
 *  páginas de perfiles distintos. */
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

/** Cursor persistido entre clicks de "Buscar más candidatos": desde qué paso seguir y qué
 *  perfiles ya se le mostraron a este recruiter (para no repetirlos). `seenKeys` = linkedinUrls
 *  normalizadas; la action lo arma a partir de los `results` acumulados de la sesión. */
export type SourcingCursor = { step: number; seenKeys: string[] };

export type SourcearParaBusquedaResult = {
  ok: true;
  /** SOLO los perfiles nuevos de esta llamada (ya scoreados, ordenados por match, hasta 10).
   *  La action los mergea con lo que ya venía mostrando. */
  results: ScoredLinkedInCandidate[];
  isLiveApi: boolean;
  metrics: SourcingMetrics;
  /** Dónde quedó el cursor — la action lo guarda en `sourcing_search_sessions.attempt`. */
  nextStep: number;
  /** true si el cursor llegó al final: no tiene sentido ofrecer "Buscar más candidatos". */
  exhausted: boolean;
};

/**
 * Recorre LinkedIn para una búsqueda juntando perfiles GENUINAMENTE NUEVOS (ni en el pool, ni
 * ya mostrados a este recruiter). Cada "paso" del cursor es un par (variante de query, página
 * de Serper); un click consume varios pasos hasta juntar `SOURCING_MAX_RESULTS` nuevos o topar
 * `MAX_STEPS_PER_CLICK`. Scorea a los nuevos con IA en una sola llamada (lote). No filtra por
 * score — el recruiter decide mirando el %.
 */
export async function sourcearParaBusqueda(
  job: JobSourcingContext,
  deps: SourcearParaBusquedaDeps,
  cursor: SourcingCursor = { step: 0, seenKeys: [] },
): Promise<SourcearParaBusquedaResult | { ok: false; error: string }> {
  const seen = new Set(cursor.seenKeys);
  const nuevos: LinkedInCandidateResult[] = [];
  let step = Math.max(0, cursor.step);
  let stepsThisClick = 0;
  let isLiveApi = true;
  let encontrados = 0;
  let enPool = 0;

  while (
    nuevos.length < SOURCING_MAX_RESULTS &&
    step < MAX_SEARCH_STEPS &&
    stepsThisClick < MAX_STEPS_PER_CLICK
  ) {
    const { variant, page } = stepToVariantPage(step);
    const res = await deps.search(buildJobSourcingQueryVariant(job, variant), page);
    if (res.error) return { ok: false, error: res.error };
    isLiveApi = res.isLiveApi;
    step += 1;
    stepsThisClick += 1;

    if (res.candidates.length === 0) {
      // Página vacía: si es la primera de la variante, las siguientes también lo estarán —
      // saltamos directo al inicio de la próxima variante en vez de gastar 2 pasos al pedo.
      if (page === 1) step = (variant + 1) * SEARCH_PAGES_PER_VARIANT;
      continue;
    }

    const existing = await deps.findExistingLinkedinUrls(
      res.candidates.map((c) => c.linkedinUrl),
    );
    for (const c of res.candidates) {
      const key = normalizeLinkedinKey(c.linkedinUrl) ?? c.id;
      if (seen.has(key)) continue; // ya mostrado antes, o ya lo juntamos en este click
      seen.add(key);
      encontrados += 1; // perfil nuevo para este click (todavía no sabemos si está en el pool)
      if (existing.has(key)) {
        enPool += 1;
        continue;
      }
      nuevos.push(c);
    }
  }

  // Una sola llamada a la IA para todos los nuevos de este click (ver scoreApplicationsBatch).
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
    .slice(0, SOURCING_MAX_RESULTS);

  return {
    ok: true,
    results,
    isLiveApi,
    metrics: { encontrados, enPool, nuevos: nuevos.length },
    nextStep: step,
    exhausted: step >= MAX_SEARCH_STEPS,
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
