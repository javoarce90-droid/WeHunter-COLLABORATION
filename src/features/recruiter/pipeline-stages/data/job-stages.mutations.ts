import { asc, eq, sql, inArray, and, gte } from "drizzle-orm";
import { getDb } from "@/db/client";
import { jobStages } from "@/db/schema";
import type { JobStage, StageKind } from "../schema";
import { resolveJobStageSeed } from "./job-stage-templates.queries";

/**
 * Inserta una etapa corriendo un lugar a las que quedan detrás, en una sola transacción:
 * si el corrimiento y el insert no fueran atómicos, dos posiciones podrían quedar iguales y
 * el orden del tablero dependería del azar.
 */
export async function insertJobStage(args: {
  organizationId: string;
  jobId: string;
  name: string;
  position: number;
  slaDays?: number | null;
}): Promise<{ id: string }> {
  const db = await getDb();
  const id = await db.rls(async (tx) => {
    await tx
      .update(jobStages)
      .set({ position: sql`${jobStages.position} + 1`, updatedAt: new Date() })
      .where(and(eq(jobStages.jobId, args.jobId), gte(jobStages.position, args.position)));

    const [row] = await tx
      .insert(jobStages)
      .values({
        organizationId: args.organizationId,
        jobId: args.jobId,
        name: args.name,
        position: args.position,
        kind: "in_process",
        slaDays: args.slaDays ?? null,
      })
      .returning({ id: jobStages.id });

    return row!.id;
  }, "db.job-stages.insert");

  return { id };
}

export async function renameJobStage(stageId: string, name: string): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(jobStages)
        .set({ name, updatedAt: new Date() })
        .where(eq(jobStages.id, stageId)),
    "db.job-stages.rename",
  );
}

export async function deleteJobStage(stageId: string): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) => tx.delete(jobStages).where(eq(jobStages.id, stageId)),
    "db.job-stages.delete",
  );
}

/** Reescribe el orden completo en una transacción: un reordenamiento a medias dejaría el
 *  tablero con posiciones duplicadas. */
export async function setJobStagePositions(
  positions: { stageId: string; position: number }[],
): Promise<void> {
  if (positions.length === 0) return;
  const db = await getDb();
  await db.rls(async (tx) => {
    for (const { stageId, position } of positions) {
      await tx
        .update(jobStages)
        .set({ position, updatedAt: new Date() })
        .where(eq(jobStages.id, stageId));
    }
  }, "db.job-stages.reorder");
}

export async function setJobStageSla(stageId: string, slaDays: number | null): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(jobStages)
        .set({ slaDays, updatedAt: new Date() })
        .where(eq(jobStages.id, stageId)),
    "db.job-stages.set-sla",
  );
}

/** Repara un job que quedó sin etapas (dato legado o creado antes de que existiera la siembra
 *  automática): si ya tiene alguna, no hace nada; si no tiene ninguna, siembra el default de la
 *  organización. Se llama tanto al mostrar el tablero como al mover un candidato al pipeline,
 *  para que ninguno de los dos vuelva a operar sobre un job con 0 columnas. */
export async function ensureJobStages(jobId: string, organizationId: string): Promise<JobStage[]> {
  const db = await getDb();
  const selectCols = {
    id: jobStages.id,
    name: jobStages.name,
    position: jobStages.position,
    slaDays: jobStages.slaDays,
    kind: jobStages.kind,
  };

  const existing = await db.rls(
    (tx) =>
      tx
        .select(selectCols)
        .from(jobStages)
        .where(and(eq(jobStages.jobId, jobId), eq(jobStages.organizationId, organizationId)))
        .orderBy(asc(jobStages.position)),
    "db.job-stages.ensure-check",
  );
  if (existing.length > 0) return existing.map((r) => ({ ...r, kind: r.kind as StageKind }));

  // Se lee fuera de la transacción: resolveJobStageSeed abre la suya y anidarlas rompe.
  const seed = await resolveJobStageSeed(organizationId);

  return db.rls(async (tx) => {
    // Recheck adentro de la transacción: si dos requests llegan casi a la vez, que la segunda
    // encuentre lo que la primera ya sembró en vez de duplicar.
    const recheck = await tx
      .select(selectCols)
      .from(jobStages)
      .where(and(eq(jobStages.jobId, jobId), eq(jobStages.organizationId, organizationId)))
      .orderBy(asc(jobStages.position));
    if (recheck.length > 0) return recheck.map((r) => ({ ...r, kind: r.kind as StageKind }));

    const inserted = await tx
      .insert(jobStages)
      .values(
        seed.map((s) => ({
          organizationId,
          jobId,
          name: s.name,
          position: s.position,
          slaDays: s.slaDays,
          kind: s.kind,
          legacyStage: s.legacyStage,
        })),
      )
      .returning(selectCols);
    return inserted.map((r) => ({ ...r, kind: r.kind as StageKind }));
  }, "db.job-stages.ensure-seed");
}

/** Etapas de varias búsquedas de una vez (para listados que muestran el tablero de fondo). */
export async function listStagesForJobs(jobIds: string[]) {
  if (jobIds.length === 0) return [];
  const db = await getDb();
  return db.rls(
    (tx) =>
      tx
        .select({
          id: jobStages.id,
          jobId: jobStages.jobId,
          name: jobStages.name,
          position: jobStages.position,
          kind: jobStages.kind,
        })
        .from(jobStages)
        .where(inArray(jobStages.jobId, jobIds)),
    "db.job-stages.for-jobs",
  );
}
