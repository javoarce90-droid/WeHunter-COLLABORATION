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

/**
 * Busca candidatos en LinkedIn para una búsqueda puntual y los scorea contra ella con IA
 * (mismo contrato que `puntuar-postulaciones.ts`). Devuelve todos los que encuentra (sin
 * filtrar por score — el recruiter decide mirando el % de cada uno), ordenados de mayor a
 * menor compatibilidad, hasta 10.
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
    candidates.map(async (c) => {
      const result = await deps.scoreApplication({
        candidate: {
          id: c.id,
          skills: c.skills,
          summary: c.snippet ?? c.headline,
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
        ...c,
        score: result.score,
        summary: result.summary,
        breakdown: result.breakdown,
        strengths: result.strengths,
        redFlags: result.redFlags,
      };
    }),
  );

  const results = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, SOURCING_MAX_RESULTS);

  return { ok: true, results, isLiveApi };
}
