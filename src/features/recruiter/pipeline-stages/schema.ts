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

/** Qué significa una etapa para el resto del sistema (espeja el enum `stage_kind`).
 *  El nombre lo elige el recruiter y no se puede interpretar; esto sí. */
export const STAGE_KINDS = ["inbox", "in_process", "offer", "hired", "rejected"] as const;
export type StageKind = (typeof STAGE_KINDS)[number];

export type JobStage = {
  id: string;
  name: string;
  position: number;
  slaDays: number | null;
  kind: StageKind;
};

/** Una etapa terminal no admite salir de ella por movimiento normal. */
export function isClosingKind(kind: StageKind): boolean {
  return kind === "hired";
}

/** La bandeja no es columna del tablero: es Postulados. */
export function isInboxKind(kind: StageKind): boolean {
  return kind === "inbox";
}

/** Molde con el que nace el pipeline de una búsqueda nueva: la config de la organización
 *  materializada como etapas propias del job. A partir de ahí cada búsqueda evoluciona sola. */
export function buildDefaultJobStages(
  configs: PipelineStageConfig[],
): { name: string; position: number; slaDays: number | null; kind: StageKind; legacyStage: ApplicationStage }[] {
  const KIND: Record<ApplicationStage, StageKind> = {
    new: "inbox",
    screening: "in_process",
    interview: "in_process",
    interview_hr: "in_process",
    interview_tech: "in_process",
    interview_client: "in_process",
    offer: "offer",
    hired: "hired",
    rejected: "rejected",
  };
  return configs
    .filter((c) => c.isActive)
    .map((c, i) => ({
      name: c.label,
      position: i,
      slaDays: c.slaDays,
      kind: KIND[c.stageKey],
      legacyStage: c.stageKey,
    }));
}

/**
 * Igual que `buildDefaultJobStages`, pero a partir de la plantilla flexible de Configuración >
 * Etapas por defecto (`job_stage_templates`, nombres libres) en vez de la config atada al enum.
 *
 * Sigue siendo necesario asignar `legacyStage` a ALGUNAS etapas: tres flujos viejos todavía
 * dependen de encontrar la etapa por ese valor exacto para mantener `stage_id` en sync
 * (`insertApplication` busca "new", `rechazarPostulacion`→`updateApplicationStage` busca
 * "rejected", y `pasarAlPipeline`→`setPipelineEntered` busca la primera etapa activa del
 * organization-wide `pipeline_stages`, que en la práctica siempre es "screening" — es la única
 * usada hoy, ningún caller pasa un `toStage` distinto). Sin esto, la primera postulación que
 * entra a una búsqueda nueva quedaría sin `stage_id` — invisible en el tablero.
 *
 * Las etapas intermedias además de la primera quedan con `legacyStage: null`: el movimiento
 * dentro del tablero (`moverAEtapa`/`moveToStage`) ya no necesita ese valor, lo deriva del
 * `kind` (`legacyStageFor`, `mover-a-etapa.ts`).
 */
export function buildJobStagesFromTemplate(
  template: { name: string; position: number; slaDays: number | null; kind: StageKind }[],
): { name: string; position: number; slaDays: number | null; kind: StageKind; legacyStage: ApplicationStage | null }[] {
  const FIXED_LEGACY: Partial<Record<StageKind, ApplicationStage>> = {
    inbox: "new",
    offer: "offer",
    hired: "hired",
    rejected: "rejected",
  };
  let primerEnProceso = true;

  return [...template]
    .sort((a, b) => a.position - b.position)
    .map((stage) => {
      let legacyStage = FIXED_LEGACY[stage.kind] ?? null;
      if (stage.kind === "in_process" && primerEnProceso) {
        legacyStage = "screening";
        primerEnProceso = false;
      }
      return {
        name: stage.name,
        position: stage.position,
        slaDays: stage.slaDays,
        kind: stage.kind,
        legacyStage,
      };
    });
}
