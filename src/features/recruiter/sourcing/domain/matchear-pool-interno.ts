import type { AiProvider, ScoreBreakdown } from "@/lib/ai";

/** Tope de candidatos scoreados por corrida contra el pool interno (guardrail contra abuso —
 *  cada score sin caché es una llamada real a la IA). El prefiltro de `listCandidatesForPoolMatch`
 *  ya debería acotar a esto, pero se aplica también acá como defensa. */
export const POOL_MATCH_MAX_CANDIDATES = 15;

export type PoolMatchJob = {
  id: string;
  /** `updated_at` de la búsqueda al momento de matchear — snapshot para invalidar el caché. */
  updatedAt: Date;
  title: string;
  position?: string | null;
  skills: string[] | null;
  objectives?: string | null;
  requirements?: string | null;
  responsibilities?: string | null;
};

export type PoolMatchCompleteness = { percent: number; faltantes: string[] };

export type PoolMatchCandidateInput = {
  id: string;
  fullName: string;
  headline: string | null;
  completeness: PoolMatchCompleteness;
  /** `updated_at` del candidato — snapshot para invalidar el caché. */
  updatedAt: Date;
  candidate: {
    id: string;
    skills: string[] | null;
    summary: string | null;
    source: string | null;
    experience: { position: string; company: string; description: string | null }[];
    education: { degree: string; institution: string; fieldOfStudy: string | null }[];
  };
};

export type PoolMatchResult = {
  candidateId: string;
  fullName: string;
  headline: string | null;
  completeness: PoolMatchCompleteness;
  score: number;
  summary: string;
  breakdown: ScoreBreakdown;
  strengths: string[];
  redFlags: string[];
  /** true si este resultado vino del caché (no se llamó a la IA en esta corrida). */
  cached: boolean;
};

export type PoolMatchCachedEntry = {
  score: number;
  summary: string;
  breakdown: ScoreBreakdown;
  strengths: string[];
  redFlags: string[];
  jobUpdatedAt: Date;
  candidateUpdatedAt: Date;
};

export type PoolMatchCacheWrite = {
  candidateId: string;
  candidateUpdatedAt: Date;
  score: number;
  summary: string;
  breakdown: ScoreBreakdown;
  strengths: string[];
  redFlags: string[];
};

/** Repositorio de caché inyectado (mismo criterio que `provider`): el dominio no conoce
 *  Drizzle, solo este contrato. La implementación real vive en
 *  `candidates/data/pool-match-cache.queries.ts` y `.mutations.ts`. */
export type PoolMatchCache = {
  getCached: (
    jobId: string,
    candidateIds: string[],
  ) => Promise<Map<string, PoolMatchCachedEntry>>;
  save: (jobId: string, jobUpdatedAt: Date, entries: PoolMatchCacheWrite[]) => Promise<void>;
};

/**
 * Matchea con IA un subconjunto ya prefiltrado del pool interno contra una búsqueda (mismo
 * contrato `scoreApplication` que ya usan Postulados y Sourcing externo/LinkedIn — ver
 * `sourcear-para-busqueda.ts`). No persiste los resultados de la búsqueda como decisión de
 * negocio: el reclutador recién postula si decide hacerlo. Sí persiste el SCORE en sí como
 * caché — si ni la búsqueda ni el candidato cambiaron desde el último match, se reusa en vez
 * de repetir la llamada a la IA.
 */
export async function matchearPoolConBusqueda(
  job: PoolMatchJob,
  candidatos: PoolMatchCandidateInput[],
  provider: Pick<AiProvider, "scoreApplication">,
  cache: PoolMatchCache,
): Promise<PoolMatchResult[]> {
  const acotados = candidatos.slice(0, POOL_MATCH_MAX_CANDIDATES);

  const cached = await cache.getCached(
    job.id,
    acotados.map((c) => c.id),
  );

  const desdeCache: { candidato: PoolMatchCandidateInput; entry: PoolMatchCachedEntry }[] = [];
  const aScorear: PoolMatchCandidateInput[] = [];
  for (const c of acotados) {
    const entry = cached.get(c.id);
    const vigente =
      entry !== undefined &&
      entry.jobUpdatedAt.getTime() === job.updatedAt.getTime() &&
      entry.candidateUpdatedAt.getTime() === c.updatedAt.getTime();
    if (vigente) {
      desdeCache.push({ candidato: c, entry });
    } else {
      aScorear.push(c);
    }
  }

  const scoreados = await Promise.all(
    aScorear.map(async (c) => {
      const result = await provider.scoreApplication({
        candidate: c.candidate,
        job: {
          title: job.title,
          position: job.position,
          skills: job.skills,
          objectives: job.objectives,
          requirements: job.requirements,
          responsibilities: job.responsibilities,
        },
      });
      return { candidato: c, result };
    }),
  );

  if (scoreados.length > 0) {
    await cache.save(
      job.id,
      job.updatedAt,
      scoreados.map(({ candidato, result }) => ({
        candidateId: candidato.id,
        candidateUpdatedAt: candidato.updatedAt,
        score: result.score,
        summary: result.summary,
        breakdown: result.breakdown,
        strengths: result.strengths,
        redFlags: result.redFlags,
      })),
    );
  }

  const results: PoolMatchResult[] = [
    ...desdeCache.map(({ candidato, entry }) => ({
      candidateId: candidato.id,
      fullName: candidato.fullName,
      headline: candidato.headline,
      completeness: candidato.completeness,
      score: entry.score,
      summary: entry.summary,
      breakdown: entry.breakdown,
      strengths: entry.strengths,
      redFlags: entry.redFlags,
      cached: true,
    })),
    ...scoreados.map(({ candidato, result }) => ({
      candidateId: candidato.id,
      fullName: candidato.fullName,
      headline: candidato.headline,
      completeness: candidato.completeness,
      score: result.score,
      summary: result.summary,
      breakdown: result.breakdown,
      strengths: result.strengths,
      redFlags: result.redFlags,
      cached: false,
    })),
  ];

  return results.sort((a, b) => b.score - a.score);
}
