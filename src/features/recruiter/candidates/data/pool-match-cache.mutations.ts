import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { poolMatchResults } from "@/db/schema";
import type { PoolMatchCacheWrite } from "@/features/recruiter/sourcing/domain/matchear-pool-interno";

/** Escrituras del caché de "Matchear con IA" del pool interno. Cliente RLS; el organizationId
 *  acota a la org activa (mismo criterio que el resto de candidates/data). */

/** Upsert en bloque (una sola sentencia INSERT, no una por candidato) de los resultados recién
 *  scoreados. Cache key es (job_id, candidate_id): re-scorear pisa el registro anterior en vez
 *  de duplicar. */
export async function savePoolMatchResults(
  organizationId: string,
  jobId: string,
  jobUpdatedAt: Date,
  entries: PoolMatchCacheWrite[],
): Promise<void> {
  if (entries.length === 0) return;
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .insert(poolMatchResults)
        .values(
          entries.map((e) => ({
            organizationId,
            jobId,
            candidateId: e.candidateId,
            score: e.score,
            summary: e.summary,
            breakdown: e.breakdown,
            strengths: e.strengths,
            redFlags: e.redFlags,
            jobUpdatedAt,
            candidateUpdatedAt: e.candidateUpdatedAt,
          })),
        )
        .onConflictDoUpdate({
          target: [poolMatchResults.jobId, poolMatchResults.candidateId],
          set: {
            score: sql`excluded.score`,
            summary: sql`excluded.summary`,
            breakdown: sql`excluded.breakdown`,
            strengths: sql`excluded.strengths`,
            redFlags: sql`excluded.red_flags`,
            jobUpdatedAt: sql`excluded.job_updated_at`,
            candidateUpdatedAt: sql`excluded.candidate_updated_at`,
            updatedAt: new Date(),
          },
        }),
    "db.pool-match-cache.save",
  );
}
