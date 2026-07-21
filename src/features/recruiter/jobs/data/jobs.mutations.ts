import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { jobs, jobStages, type Job } from "@/db/schema";
import { getPipelineStageConfigs } from "../../pipeline-stages/data/pipeline-stages.queries";
import { buildDefaultJobStages } from "../../pipeline-stages/schema";
import type { JobDetails } from "../domain/job-details";

/** Escrituras de búsquedas. Cliente RLS; el organizationId acota a la org activa. */

export async function insertJob(
  args: {
    organizationId: string;
    title: string;
    description: string | null;
    createdBy: string;
  } & JobDetails,
): Promise<{ jobId: string }> {
  const db = await getDb();
  const { organizationId, title, description, createdBy, ...details } = args;
  // Se lee fuera de la transacción: getPipelineStageConfigs abre la suya y anidarlas rompe.
  const configs = await getPipelineStageConfigs(organizationId);
  // El job y su pipeline nacen juntos: una búsqueda sin etapas no se puede operar, así que
  // sembrarlas después dejaría una ventana con el tablero roto.
  const jobId = await db.rls(async (tx) => {
    const [row] = await tx
      .insert(jobs)
      .values({
        organizationId,
        title,
        description,
        createdBy,
        ...details,
      })
      .returning({ id: jobs.id });

    await tx.insert(jobStages).values(
      buildDefaultJobStages(configs).map((s) => ({
        organizationId,
        jobId: row!.id,
        name: s.name,
        position: s.position,
        slaDays: s.slaDays,
        kind: s.kind,
        legacyStage: s.legacyStage,
      })),
    );

    return row!.id;
  }, "db.jobs.insert");

  return { jobId };
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
  fields: { title: string; description: string | null } & JobDetails,
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
