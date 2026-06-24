import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { applications, applicationEvents, candidates, jobs, profiles } from "@/db/schema";
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

export type OrgReportRaw = {
  jobsByStatus: { status: string; count: number }[];
  candidatesCount: number;
  stageCounts: StageCountRow[];
  sourceCounts: SourceCountRow[];
  trends: { week: string; count: number }[];
  hireTimings: { appCreated: Date; hiredAt: Date }[];
  jobsByRecruiter: { ownerId: string | null; name: string | null; count: number }[];
  hiresByRecruiter: { ownerId: string | null; count: number }[];
};

/**
 * Datos crudos org-wide para la pantalla global de Reportes. Todas las lecturas en UNA
 * transacción RLS (database.md #3). `since` acota por fecha de postulación (null = histórico).
 */
export async function getOrgReportData(
  organizationId: string,
  since: Date | null,
): Promise<OrgReportRaw> {
  const db = await getDb();
  const periodFilter = since ? gte(applications.createdAt, since) : undefined;

  return db.rls(async (tx) => {
    const [
      jobsByStatus,
      candRows,
      stageCounts,
      sourceCounts,
      trends,
      hireTimings,
      jobsByRecruiter,
      hiresByRecruiter,
    ] = await Promise.all([
      tx
        .select({ status: jobs.status, count: sql<number>`count(*)::int` })
        .from(jobs)
        .where(eq(jobs.organizationId, organizationId))
        .groupBy(jobs.status),

      tx
        .select({ n: sql<number>`count(*)::int` })
        .from(candidates)
        .where(eq(candidates.organizationId, organizationId)),

      tx
        .select({ stage: applications.stage, count: sql<number>`count(*)::int` })
        .from(applications)
        .where(and(eq(applications.organizationId, organizationId), periodFilter))
        .groupBy(applications.stage),

      tx
        .select({ source: candidates.source, count: sql<number>`count(*)::int` })
        .from(applications)
        .innerJoin(candidates, eq(applications.candidateId, candidates.id))
        .where(and(eq(applications.organizationId, organizationId), periodFilter))
        .groupBy(candidates.source),

      tx
        .select({
          week: sql<string>`to_char(date_trunc('week', ${applications.createdAt}), 'YYYY-MM-DD')`,
          count: sql<number>`count(*)::int`,
        })
        .from(applications)
        .where(and(eq(applications.organizationId, organizationId), periodFilter))
        .groupBy(sql`date_trunc('week', ${applications.createdAt})`)
        .orderBy(sql`date_trunc('week', ${applications.createdAt})`),

      tx
        .select({
          appCreated: applications.createdAt,
          hiredAt: applicationEvents.createdAt,
        })
        .from(applicationEvents)
        .innerJoin(applications, eq(applicationEvents.applicationId, applications.id))
        .where(
          and(
            eq(applications.organizationId, organizationId),
            eq(applicationEvents.toStage, "hired"),
            periodFilter,
          ),
        )
        .limit(500),

      tx
        .select({
          ownerId: jobs.createdBy,
          name: profiles.fullName,
          count: sql<number>`count(*)::int`,
        })
        .from(jobs)
        .leftJoin(profiles, eq(jobs.createdBy, profiles.id))
        .where(eq(jobs.organizationId, organizationId))
        .groupBy(jobs.createdBy, profiles.fullName),

      tx
        .select({ ownerId: jobs.createdBy, count: sql<number>`count(*)::int` })
        .from(applications)
        .innerJoin(jobs, eq(applications.jobId, jobs.id))
        .where(
          and(eq(applications.organizationId, organizationId), eq(applications.stage, "hired")),
        )
        .groupBy(jobs.createdBy),
    ]);

    return {
      jobsByStatus,
      candidatesCount: Number(candRows[0]?.n ?? 0),
      stageCounts,
      sourceCounts,
      trends,
      hireTimings,
      jobsByRecruiter,
      hiresByRecruiter,
    };
  }, "db.reports.org");
}

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
