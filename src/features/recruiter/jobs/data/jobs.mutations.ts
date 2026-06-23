import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { jobs, type Job } from "@/db/schema";

/** Escrituras de búsquedas. Cliente RLS; el organizationId acota a la org activa. */

export async function insertJob(args: {
  organizationId: string;
  title: string;
  description: string | null;
  createdBy: string;
}): Promise<{ jobId: string }> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .insert(jobs)
      .values({
        organizationId: args.organizationId,
        title: args.title,
        description: args.description,
        createdBy: args.createdBy,
      })
      .returning({ id: jobs.id }),
    "db.jobs.insert",
  );
  return { jobId: rows[0]!.id };
}

export async function updateJobStatus(
  jobId: string,
  organizationId: string,
  nuevoEstado: Job["status"],
): Promise<void> {
  const db = await getDb();
  await db.rls((tx) =>
    tx
      .update(jobs)
      .set({ status: nuevoEstado, updatedAt: new Date() })
      .where(and(eq(jobs.id, jobId), eq(jobs.organizationId, organizationId))),
    "db.jobs.update-status",
  );
}

export async function updateJobFields(
  jobId: string,
  organizationId: string,
  fields: { title: string; description: string | null },
): Promise<{ updated: boolean }> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .update(jobs)
      .set({ ...fields, updatedAt: new Date() })
      .where(and(eq(jobs.id, jobId), eq(jobs.organizationId, organizationId)))
      .returning({ id: jobs.id }),
    "db.jobs.update-fields",
  );
  return { updated: rows.length > 0 };
}
