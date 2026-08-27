import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sourcingSearchSessions } from "@/db/schema";
import type { ScoredLinkedInCandidate, SourcingMetrics } from "../domain/sourcear-para-busqueda";

/** Lecturas de la sesión de trabajo en curso de "Sourcing con IA" (job + recruiter). Cliente
 *  RLS; el organizationId acota a la org activa (mismo criterio que candidates/data). */

export type SourcingSession = {
  attempt: number;
  results: ScoredLinkedInCandidate[];
  metrics: SourcingMetrics;
  isLiveApi: boolean;
};

/** Sesión en curso de ESTE recruiter para este job, si existe — para restaurarla si navegó
 *  afuera mientras la búsqueda corría (ver AiJobSourcingResults.tsx). */
export async function getSourcingSession(
  organizationId: string,
  jobId: string,
  profileId: string,
): Promise<SourcingSession | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          attempt: sourcingSearchSessions.attempt,
          results: sourcingSearchSessions.results,
          metrics: sourcingSearchSessions.metrics,
          isLiveApi: sourcingSearchSessions.isLiveApi,
        })
        .from(sourcingSearchSessions)
        .where(
          and(
            eq(sourcingSearchSessions.organizationId, organizationId),
            eq(sourcingSearchSessions.jobId, jobId),
            eq(sourcingSearchSessions.profileId, profileId),
          ),
        )
        .limit(1),
    "db.sourcing-sessions.get",
  );
  const row = rows[0];
  if (!row) return null;
  return {
    attempt: row.attempt,
    results: row.results as ScoredLinkedInCandidate[],
    metrics: row.metrics as SourcingMetrics,
    isLiveApi: row.isLiveApi,
  };
}
