import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { applications, applicationEvents, candidates } from "@/db/schema";
import type {
  StageCountRow,
  SourceCountRow,
  EventRow,
} from "../domain/job-performance";

export type JobReportRaw = {
  stageCounts: StageCountRow[];
  sourceCounts: SourceCountRow[];
  events: EventRow[];
};

/**
 * Datos crudos de la performance de una búsqueda. Las tres lecturas (counts por etapa,
 * counts por fuente, eventos de historial) van en UNA sola transacción RLS (database.md #3):
 * pagamos el overhead de RLS una vez y corremos los SELECT en paralelo.
 */
export async function getJobReportData(
  jobId: string,
  organizationId: string,
): Promise<JobReportRaw> {
  const db = await getDb();
  return db.rls(async (tx) => {
    const [stageCounts, sourceCounts, events] = await Promise.all([
      tx
        .select({
          stage: applications.stage,
          count: sql<number>`count(*)::int`,
        })
        .from(applications)
        .where(
          and(
            eq(applications.jobId, jobId),
            eq(applications.organizationId, organizationId),
          ),
        )
        .groupBy(applications.stage),

      tx
        .select({
          source: candidates.source,
          count: sql<number>`count(*)::int`,
        })
        .from(applications)
        .innerJoin(candidates, eq(applications.candidateId, candidates.id))
        .where(
          and(
            eq(applications.jobId, jobId),
            eq(applications.organizationId, organizationId),
          ),
        )
        .groupBy(candidates.source),

      tx
        .select({
          applicationId: applicationEvents.applicationId,
          fromStage: applicationEvents.fromStage,
          toStage: applicationEvents.toStage,
          createdAt: applicationEvents.createdAt,
        })
        .from(applicationEvents)
        .innerJoin(applications, eq(applicationEvents.applicationId, applications.id))
        .where(
          and(
            eq(applications.jobId, jobId),
            eq(applications.organizationId, organizationId),
          ),
        )
        .orderBy(applicationEvents.createdAt),
    ]);

    return {
      stageCounts,
      sourceCounts,
      events,
    } as JobReportRaw;
  }, "db.reports.job");
}
