import { cache } from "react";
import { and, eq, desc, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { jobs, applications, type Job } from "@/db/schema";

/** Lecturas de búsquedas. Cliente RLS; además filtramos por organizationId activa. */

// Cap defensivo: ningún listado sin limit (database.md regla #4). La paginación real
// (cursor + UI) queda como follow-up; por ahora cubrimos cargas razonables.
const LIST_LIMIT = 100;

export async function listJobs(organizationId: string): Promise<Job[]> {
  const db = await getDb();
  return db.rls(
    (tx) =>
      tx
        .select()
        .from(jobs)
        .where(eq(jobs.organizationId, organizationId))
        .orderBy(desc(jobs.createdAt))
        .limit(LIST_LIMIT),
    "db.jobs.list",
  );
}

/** Búsqueda + cantidad de candidatos (postulaciones) en su pipeline. */
export type JobWithStats = Job & { candidateCount: number };

/**
 * Listado para la pantalla de búsquedas: cada job con el conteo de su pipeline.
 * Una sola query (LEFT JOIN + GROUP BY), no N+1 (database.md reglas #3 y #6). El conteo
 * usa los índices `jobs_org_idx` y `applications_job_idx`. RLS aísla por org en ambas tablas.
 */
export async function listJobsWithStats(
  organizationId: string,
): Promise<JobWithStats[]> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          job: jobs,
          candidateCount: sql<number>`count(${applications.id})::int`,
        })
        .from(jobs)
        .leftJoin(applications, eq(applications.jobId, jobs.id))
        .where(eq(jobs.organizationId, organizationId))
        .groupBy(jobs.id)
        .orderBy(desc(jobs.createdAt))
        .limit(LIST_LIMIT),
    "db.jobs.list-with-stats",
  );
  return rows.map(({ job, candidateCount }) => ({ ...job, candidateCount }));
}

/**
 * Una búsqueda por id. Cacheada por request (`cache()` de React): el layout del workspace y
 * la pestaña Detalle la piden ambos en un mismo render y comparten una única transacción RLS.
 */
export const getJobById = cache(async function getJobById(
  jobId: string,
  organizationId: string,
): Promise<Job | null> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.organizationId, organizationId)))
      .limit(1),
    "db.jobs.get",
  );
  return rows[0] ?? null;
});

export async function getJobStatus(
  jobId: string,
  organizationId: string,
): Promise<Job["status"] | null> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({ status: jobs.status })
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.organizationId, organizationId)))
      .limit(1),
    "db.jobs.get-status",
  );
  return rows[0]?.status ?? null;
}
