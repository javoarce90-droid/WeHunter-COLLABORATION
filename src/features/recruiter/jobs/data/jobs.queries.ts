import { and, eq, desc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { jobs, type Job } from "@/db/schema";

/** Lecturas de búsquedas. Cliente RLS; además filtramos por organizationId activa. */

export async function listJobs(organizationId: string): Promise<Job[]> {
  const db = await getDb();
  return db.rls((tx) =>
    tx
      .select()
      .from(jobs)
      .where(eq(jobs.organizationId, organizationId))
      .orderBy(desc(jobs.createdAt)),
  );
}

export async function getJobById(
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
  );
  return rows[0] ?? null;
}

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
  );
  return rows[0]?.status ?? null;
}
