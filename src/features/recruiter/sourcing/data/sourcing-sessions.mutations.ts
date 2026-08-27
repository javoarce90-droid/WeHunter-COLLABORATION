import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sourcingSearchSessions } from "@/db/schema";
import type { ScoredLinkedInCandidate, SourcingMetrics } from "../domain/sourcear-para-busqueda";

/** Escrituras de la sesión de trabajo en curso de "Sourcing con IA". Cliente RLS. */

/** Upsert de la sesión en curso — target (job_id, profile_id), pisa la anterior en vez de
 *  acumular historial (es estado de trabajo, no un registro permanente). */
export async function saveSourcingSession(
  organizationId: string,
  jobId: string,
  profileId: string,
  data: {
    attempt: number;
    results: ScoredLinkedInCandidate[];
    metrics: SourcingMetrics;
    isLiveApi: boolean;
  },
): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .insert(sourcingSearchSessions)
        .values({
          organizationId,
          jobId,
          profileId,
          attempt: data.attempt,
          results: data.results,
          metrics: data.metrics,
          isLiveApi: data.isLiveApi,
        })
        .onConflictDoUpdate({
          target: [sourcingSearchSessions.jobId, sourcingSearchSessions.profileId],
          set: {
            attempt: sql`excluded.attempt`,
            results: sql`excluded.results`,
            metrics: sql`excluded.metrics`,
            isLiveApi: sql`excluded.is_live_api`,
            updatedAt: new Date(),
          },
        }),
    "db.sourcing-sessions.save",
  );
}

/** Borra la sesión — señal explícita de "Limpiar" en la UI. */
export async function deleteSourcingSession(
  organizationId: string,
  jobId: string,
  profileId: string,
): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .delete(sourcingSearchSessions)
        .where(
          and(
            eq(sourcingSearchSessions.organizationId, organizationId),
            eq(sourcingSearchSessions.jobId, jobId),
            eq(sourcingSearchSessions.profileId, profileId),
          ),
        ),
    "db.sourcing-sessions.delete",
  );
}
