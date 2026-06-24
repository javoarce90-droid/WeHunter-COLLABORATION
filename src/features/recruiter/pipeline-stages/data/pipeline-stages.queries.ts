import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { pipelineStages } from "@/db/schema";
import { APPLICATION_STAGES, STAGE_LABELS, type ApplicationStage } from "../../applications/schema";
import { DEFAULT_STAGE_CONFIGS, type PipelineStageConfig } from "../schema";

/**
 * Configuración efectiva de etapas para una org. Mezcla los overrides de la DB
 * con los defaults en código — nunca hay rows vacíos que romper.
 */
export async function getPipelineStageConfigs(
  organizationId: string,
): Promise<PipelineStageConfig[]> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select()
        .from(pipelineStages)
        .where(eq(pipelineStages.organizationId, organizationId)),
    "db.pipeline-stages.list",
  );

  const overrideMap = new Map(rows.map((r) => [r.stageKey as ApplicationStage, r]));

  return APPLICATION_STAGES.map((key) => {
    const override = overrideMap.get(key);
    return {
      stageKey: key,
      label: override?.labelOverride ?? STAGE_LABELS[key],
      isActive: override?.isActive ?? DEFAULT_STAGE_CONFIGS.find((d) => d.stageKey === key)!.isActive,
      slaDays: override?.slaDays ?? null,
    };
  });
}
