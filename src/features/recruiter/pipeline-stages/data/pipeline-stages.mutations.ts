import { eq, and } from "drizzle-orm";
import { getDb } from "@/db/client";
import { pipelineStages } from "@/db/schema";
import type { ApplicationStage } from "../../applications/schema";

export type StageConfigPatch = {
  labelOverride?: string | null;
  isActive?: boolean;
  slaDays?: number | null;
};

export async function upsertPipelineStageConfig(
  organizationId: string,
  stageKey: ApplicationStage,
  patch: StageConfigPatch,
): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .insert(pipelineStages)
        .values({
          organizationId,
          stageKey,
          labelOverride: patch.labelOverride ?? null,
          isActive: patch.isActive ?? true,
          slaDays: patch.slaDays ?? null,
        })
        .onConflictDoUpdate({
          target: [pipelineStages.organizationId, pipelineStages.stageKey],
          set: {
            ...(patch.labelOverride !== undefined && { labelOverride: patch.labelOverride }),
            ...(patch.isActive !== undefined && { isActive: patch.isActive }),
            ...(patch.slaDays !== undefined && { slaDays: patch.slaDays }),
            updatedAt: new Date(),
          },
        }),
    "db.pipeline-stages.upsert",
  );
}

export async function resetPipelineStageConfig(
  organizationId: string,
  stageKey: ApplicationStage,
): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .delete(pipelineStages)
        .where(
          and(
            eq(pipelineStages.organizationId, organizationId),
            eq(pipelineStages.stageKey, stageKey),
          ),
        ),
    "db.pipeline-stages.reset",
  );
}
