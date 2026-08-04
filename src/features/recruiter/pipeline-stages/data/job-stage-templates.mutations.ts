import { eq, sql, and, gte } from "drizzle-orm";
import { getDb } from "@/db/client";
import { jobStageTemplates } from "@/db/schema";
import type { StageTemplateSeed } from "../domain/gestionar-plantilla-etapas";

/** Inserta una etapa corriendo un lugar a las que quedan detrás, en una sola transacción
 *  (mismo motivo que `insertJobStage`: un corrimiento no atómico deja posiciones duplicadas). */
export async function insertStageTemplate(args: {
  organizationId: string;
  name: string;
  position: number;
  slaDays?: number | null;
}): Promise<{ id: string }> {
  const db = await getDb();
  const id = await db.rls(async (tx) => {
    await tx
      .update(jobStageTemplates)
      .set({ position: sql`${jobStageTemplates.position} + 1`, updatedAt: new Date() })
      .where(and(eq(jobStageTemplates.organizationId, args.organizationId), gte(jobStageTemplates.position, args.position)));

    const [row] = await tx
      .insert(jobStageTemplates)
      .values({
        organizationId: args.organizationId,
        name: args.name,
        position: args.position,
        kind: "in_process",
        slaDays: args.slaDays ?? null,
      })
      .returning({ id: jobStageTemplates.id });

    return row!.id;
  }, "db.job-stage-templates.insert");

  return { id };
}

export async function renameStageTemplate(stageId: string, name: string): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) => tx.update(jobStageTemplates).set({ name, updatedAt: new Date() }).where(eq(jobStageTemplates.id, stageId)),
    "db.job-stage-templates.rename",
  );
}

export async function deleteStageTemplate(stageId: string): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) => tx.delete(jobStageTemplates).where(eq(jobStageTemplates.id, stageId)),
    "db.job-stage-templates.delete",
  );
}

/** Reescribe el orden completo en una transacción (mismo motivo que `setJobStagePositions`). */
export async function setStageTemplatePositions(
  positions: { stageId: string; position: number }[],
): Promise<void> {
  if (positions.length === 0) return;
  const db = await getDb();
  await db.rls(async (tx) => {
    for (const { stageId, position } of positions) {
      await tx
        .update(jobStageTemplates)
        .set({ position, updatedAt: new Date() })
        .where(eq(jobStageTemplates.id, stageId));
    }
  }, "db.job-stage-templates.reorder");
}

export async function setStageTemplateSla(stageId: string, slaDays: number | null): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) => tx.update(jobStageTemplates).set({ slaDays, updatedAt: new Date() }).where(eq(jobStageTemplates.id, stageId)),
    "db.job-stage-templates.set-sla",
  );
}

/** Reemplaza la plantilla entera (usado al aplicar un preset y al sembrar una organización
 *  nueva): borra lo que había y inserta el set completo, en una sola transacción. */
export async function replaceStageTemplate(
  organizationId: string,
  items: StageTemplateSeed[],
): Promise<void> {
  const db = await getDb();
  await db.rls(async (tx) => {
    await tx.delete(jobStageTemplates).where(eq(jobStageTemplates.organizationId, organizationId));
    await tx.insert(jobStageTemplates).values(
      items.map((item) => ({
        organizationId,
        name: item.name,
        position: item.position,
        slaDays: item.slaDays,
        kind: item.kind,
      })),
    );
  }, "db.job-stage-templates.replace");
}
