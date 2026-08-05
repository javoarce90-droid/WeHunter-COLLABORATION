import type {
  ScoreApplicationInput,
  ScoreApplicationResult,
  ScoreBreakdown,
} from "@/lib/ai/provider";
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
};

/** Arma el texto libre de búsqueda a partir del puesto real (o el título), skills, seniority
 *  y ubicación de la búsqueda — sin que el recruiter tenga que tipear nada. */
export function buildJobSourcingQuery(job: JobSourcingContext): string {
  const terms = [
    job.position?.trim() || job.title.trim() || null,
    ...(job.skills ?? []),
    job.seniority,
    job.location,
  ].filter((t): t is string => Boolean(t && t.trim()));
  return terms.join(" ");
}

/** Scorea un candidato de LinkedIn contra una búsqueda con IA (mismo contrato que
 *  `puntuar-postulaciones.ts`). Función pura reusada tanto por `sourcearParaBusqueda` (lote,
 *  Sourcing con IA) como por el scoring puntual de Sourcing Manual (un candidato a la vez). */
export async function scoreLinkedInCandidate(
  candidate: LinkedInCandidateResult,
  job: JobSourcingContext,
  scoreApplication: SourcearParaBusquedaDeps["scoreApplication"],
): Promise<ScoredLinkedInCandidate> {
  const result = await scoreApplication({
    candidate: {
      id: candidate.id,
      skills: candidate.skills,
      summary: candidate.snippet ?? candidate.headline,
      source: "linkedin",
      // El motor de sourcing no trae experiencia/educación estructurada (solo snippet de
      // búsqueda) — el candidato recién arma su perfil completo si se importa al pool.
      experience: [],
      education: [],
    },
    job: {
      title: job.title,
      position: job.position,
      skills: job.skills,
      objectives: job.objectives,
      requirements: job.requirements,
      responsibilities: job.responsibilities,
    },
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
 * Busca candidatos en LinkedIn para una búsqueda puntual y los scorea contra ella con IA.
 * Devuelve todos los que encuentra (sin filtrar por score — el recruiter decide mirando el %
 * de cada uno), ordenados de mayor a menor compatibilidad, hasta 10.
 */
export async function sourcearParaBusqueda(
  job: JobSourcingContext,
  deps: SourcearParaBusquedaDeps,
): Promise<
  | { ok: true; results: ScoredLinkedInCandidate[]; isLiveApi: boolean }
  | { ok: false; error: string }
> {
  const query = buildJobSourcingQuery(job);
  const { candidates, isLiveApi, error } = await deps.search(query);
  if (error) return { ok: false, error };

  const scored = await Promise.all(
    candidates.map((c) => scoreLinkedInCandidate(c, job, deps.scoreApplication)),
  );

  const results = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, SOURCING_MAX_RESULTS);

  return { ok: true, results, isLiveApi };
}
