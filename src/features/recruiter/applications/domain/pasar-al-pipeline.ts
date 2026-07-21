import { STAGE_LABELS, type ApplicationStage } from "../schema";
import type { ApplicationRow } from "./postular-candidato";

// ---- Tipos del caso de uso ----

/** La postulación tal como la necesita este caso de uso: la fila base más el dato que
 *  distingue bandeja de pipeline. */
export type InboxApplicationRow = ApplicationRow & {
  pipelineEnteredAt: Date | null;
};

export type PasarAlPipelineInput = {
  applicationId: string;
  /** Etapa destino. Si no viene, entra a la primera etapa activa del tablero. */
  toStage?: ApplicationStage;
};

export type PasarAlPipelineContext = {
  userId: string;
  organizationId: string;
  role: "owner" | "admin" | "recruiter" | "consultant";
};

export type PasarAlPipelineDeps = {
  getApplicationById: (
    applicationId: string,
    organizationId: string,
  ) => Promise<InboxApplicationRow | null>;
  /** Etapas activas del tablero, en orden. La bandeja ("new") no cuenta como etapa destino. */
  getActiveStages: (organizationId: string) => Promise<ApplicationStage[]>;
  setPipelineEntered: (
    applicationId: string,
    fromStage: ApplicationStage,
    toStage: ApplicationStage,
  ) => Promise<ApplicationRow>;
};

// ---- Caso de uso ----

/**
 * Avanza una postulación de la bandeja de Postulados al pipeline: es la decisión explícita
 * del recruiter de trabajar ese candidato en el proceso. Marca `pipeline_entered_at` y la
 * deja en una etapa real del tablero.
 *
 * "new" no es un destino válido: significa "sin decisión tomada", que es justamente el
 * estado del que estamos saliendo.
 */
export async function pasarAlPipeline(
  input: PasarAlPipelineInput,
  ctx: PasarAlPipelineContext,
  deps: PasarAlPipelineDeps,
): Promise<{ ok: true; data: ApplicationRow } | { ok: false; error: string }> {
  if (ctx.role === "consultant") {
    return { ok: false, error: "Los consultores no pueden avanzar candidatos al pipeline." };
  }

  const application = await deps.getApplicationById(input.applicationId, ctx.organizationId);
  if (!application) {
    return { ok: false, error: "Postulación no encontrada." };
  }

  if (application.pipelineEnteredAt) {
    return { ok: false, error: "El candidato ya está en el pipeline." };
  }

  if (application.stage === "rejected") {
    return { ok: false, error: "El candidato está descartado: reactivalo antes de avanzarlo." };
  }

  const activeStages: ApplicationStage[] = (
    await deps.getActiveStages(ctx.organizationId)
  ).filter((s) => s !== "new" && s !== "rejected");
  if (activeStages.length === 0) {
    return { ok: false, error: "No hay etapas activas en el pipeline." };
  }

  const toStage = input.toStage ?? activeStages[0];
  if (!activeStages.includes(toStage)) {
    return { ok: false, error: `La etapa "${STAGE_LABELS[toStage]}" no está disponible.` };
  }

  const updated = await deps.setPipelineEntered(input.applicationId, application.stage, toStage);
  return { ok: true, data: updated };
}
