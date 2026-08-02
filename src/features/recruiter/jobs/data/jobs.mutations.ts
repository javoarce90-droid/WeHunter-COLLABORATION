import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { jobs, jobStages, type Job } from "@/db/schema";
import { listStageTemplates } from "../../pipeline-stages/data/job-stage-templates.queries";
import { buildJobStagesFromTemplate } from "../../pipeline-stages/schema";
import { buildDefaultStageTemplate } from "../../pipeline-stages/domain/gestionar-plantilla-etapas";
import type { JobDetails } from "../domain/job-details";

/** Escrituras de búsquedas. Cliente RLS; el organizationId acota a la org activa. */

export async function insertJob(
  args: {
    organizationId: string;
    title: string;
    description: string | null;
    createdBy: string;
    assignedTo: string;
  } & JobDetails,
): Promise<{ jobId: string }> {
  const db = await getDb();
  const { organizationId, title, description, createdBy, assignedTo, ...details } = args;
  // Se lee fuera de la transacción: listStageTemplates abre la suya y anidarlas rompe.
  // Si la org no tiene plantilla propia todavía (creada antes de Configuración > Etapas por
  // defecto, y nadie generó el backfill manual), se usa el default de código como semilla de
  // ESTE job puntual — no bloquea la creación de la búsqueda a que exista una fila en
  // job_stage_templates.
  const template = await listStageTemplates(organizationId);
  const seed = buildJobStagesFromTemplate(template.length > 0 ? template : buildDefaultStageTemplate());
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
        assignedTo,
        ...details,
      })
      .returning({ id: jobs.id });

    await tx.insert(jobStages).values(
      seed.map((s) => ({
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

export async function updateJobAssignedTo(
  jobId: string,
  organizationId: string,
  membershipId: string,
): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(jobs)
        .set({ assignedTo: membershipId, updatedAt: new Date() })
        .where(and(eq(jobs.id, jobId), eq(jobs.organizationId, organizationId))),
    "db.jobs.update-assigned-to",
  );
}

export async function updateJobSourcer(
  jobId: string,
  organizationId: string,
  membershipId: string | null,
): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(jobs)
        .set({ sourcerId: membershipId, updatedAt: new Date() })
        .where(and(eq(jobs.id, jobId), eq(jobs.organizationId, organizationId))),
    "db.jobs.update-sourcer",
  );
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

export async function incrementShareCount(jobId: string, organizationId: string): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(jobs)
        .set({ shareCount: sql`${jobs.shareCount} + 1` })
        .where(and(eq(jobs.id, jobId), eq(jobs.organizationId, organizationId))),
    "db.jobs.increment-share-count",
  );
}
