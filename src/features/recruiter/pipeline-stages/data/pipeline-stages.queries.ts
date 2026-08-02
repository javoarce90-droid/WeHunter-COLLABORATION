import { and, eq } from "drizzle-orm";
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

/** Etapas activas de la org, en el orden del tablero. Lo usa `pasarAlPipeline` para saber a
 *  qué etapa entra una postulación que sale de la bandeja. */
export async function getActiveStages(
  organizationId: string,
): Promise<ApplicationStage[]> {
  const configs = await getPipelineStageConfigs(organizationId);
  return configs.filter((c) => c.isActive).map((c) => c.stageKey);
}

/** Si una etapa puntual está activa para la org. Usado como autorización primaria antes de
 *  mover un candidato a esa etapa (moverEtapa) — no trae el resto de la config, que no hace falta. */
export async function isStageActive(
  organizationId: string,
  stageKey: ApplicationStage,
): Promise<boolean> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({ isActive: pipelineStages.isActive })
        .from(pipelineStages)
        .where(
          and(
            eq(pipelineStages.organizationId, organizationId),
            eq(pipelineStages.stageKey, stageKey),
          ),
        )
        .limit(1),
    "db.pipeline-stages.is-active",
  );
  return rows[0]?.isActive ?? DEFAULT_STAGE_CONFIGS.find((d) => d.stageKey === stageKey)!.isActive;
}
