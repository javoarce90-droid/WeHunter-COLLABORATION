import {
  APPLICATION_STAGES,
  STAGE_LABELS,
  isClosingStage,
  type ApplicationStage,
} from "../applications/schema";

export type PipelineStageConfig = {
  stageKey: ApplicationStage;
  label: string;
  isActive: boolean;
  slaDays: number | null;
};

/** Defaults en código — no requiere filas en DB. La tabla solo persiste overrides. */
const DEFAULT_ACTIVE: Record<ApplicationStage, boolean> = {
  new: true,
  screening: true,
  interview: true,
  interview_hr: true,
  interview_tech: true,
  interview_client: true,
  offer: true,
  hired: true,
  rejected: true,
};

export const DEFAULT_STAGE_CONFIGS: PipelineStageConfig[] = APPLICATION_STAGES.map(
  (key) => ({
    stageKey: key,
    label: STAGE_LABELS[key],
    isActive: DEFAULT_ACTIVE[key],
    slaDays: null,
  }),
);

/** Las etapas de cierre no se pueden desactivar. */
export function isNonDeactivatable(stage: ApplicationStage): boolean {
  return isClosingStage(stage);
}

export const configurarEtapaSchema = {
  stageKey: APPLICATION_STAGES,
};
