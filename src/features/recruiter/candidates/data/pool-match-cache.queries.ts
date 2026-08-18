import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { poolMatchResults } from "@/db/schema";
import type { PoolMatchCachedEntry } from "@/features/recruiter/sourcing/domain/matchear-pool-interno";

/** Lecturas del caché de "Matchear con IA" del pool interno. Cliente RLS; el organizationId
 *  acota a la org activa (mismo criterio que el resto de candidates/data). */

export async function getCachedPoolMatches(
  organizationId: string,
  jobId: string,
  candidateIds: string[],
): Promise<Map<string, PoolMatchCachedEntry>> {
  if (candidateIds.length === 0) return new Map();
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          candidateId: poolMatchResults.candidateId,
          score: poolMatchResults.score,
          summary: poolMatchResults.summary,
          breakdown: poolMatchResults.breakdown,
          strengths: poolMatchResults.strengths,
          redFlags: poolMatchResults.redFlags,
          jobUpdatedAt: poolMatchResults.jobUpdatedAt,
          candidateUpdatedAt: poolMatchResults.candidateUpdatedAt,
        })
        .from(poolMatchResults)
        .where(
          and(
            eq(poolMatchResults.organizationId, organizationId),
            eq(poolMatchResults.jobId, jobId),
            inArray(poolMatchResults.candidateId, candidateIds),
          ),
        ),
    "db.pool-match-cache.get",
  );

  const map = new Map<string, PoolMatchCachedEntry>();
  for (const r of rows) {
    map.set(r.candidateId, {
      score: r.score,
      summary: r.summary,
      breakdown: r.breakdown,
      strengths: r.strengths,
      redFlags: r.redFlags,
      jobUpdatedAt: r.jobUpdatedAt,
      candidateUpdatedAt: r.candidateUpdatedAt,
    });
  }
  return map;
}
