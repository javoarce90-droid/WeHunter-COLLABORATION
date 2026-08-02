import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";
import type { ApplicationStage } from "../schema";
import type { JobStage } from "@/features/recruiter/pipeline-stages/schema";
import { isClosingKind } from "@/features/recruiter/pipeline-stages/schema";

/**
 * Mueve una postulación a una etapa del pipeline de SU búsqueda.
 *
 * Reemplaza a `moverEtapa` (que trabajaba sobre el enum global) ahora que cada búsqueda
 * tiene sus propias etapas. La guarda nueva e importante es que la etapa destino pertenezca
 * a la misma búsqueda: con etapas por job, un id de otra búsqueda dejaría la postulación en
 * un tablero al que no pertenece.
 */

export type MoverAEtapaInput = {
  applicationId: string;
  toStageId: string;
};

export type MoverAEtapaContext = {
  userId: string;
  organizationId: string;
  role: OrgRole;
};

export type ApplicationEnPipeline = {
  id: string;
  jobId: string;
  stageId: string | null;
  /** Kind de la etapa donde está hoy; null si todavía no fue migrada. */
  stageKind: JobStage["kind"] | null;
};

export type MoverAEtapaDeps = {
  getApplication: (
    applicationId: string,
    organizationId: string,
  ) => Promise<ApplicationEnPipeline | null>;
  getStage: (
    stageId: string,
    organizationId: string,
  ) => Promise<(JobStage & { jobId: string }) | null>;
  /** Persiste el movimiento y el evento de historial. `legacyStage` mantiene en sync la
   *  columna enum mientras queden consumidores leyéndola. */
  moveToStage: (args: {
    applicationId: string;
    toStageId: string;
    legacyStage: ApplicationStage;
  }) => Promise<void>;
};

/** Valor del enum que le corresponde a una etapa, para el espejo de compatibilidad. Las
 *  etapas creadas por el recruiter no salieron del enum, así que se derivan del kind. */
export function legacyStageFor(stage: JobStage & { legacyStage?: ApplicationStage | null }): ApplicationStage {
  if (stage.legacyStage) return stage.legacyStage;
  switch (stage.kind) {
    case "inbox":
      return "new";
    case "offer":
      return "offer";
    case "hired":
      return "hired";
    case "rejected":
      return "rejected";
    default:
      return "screening";
  }
}

export async function moverAEtapa(
  input: MoverAEtapaInput,
  ctx: MoverAEtapaContext,
  deps: MoverAEtapaDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!can(ctx.role, "pipeline.move")) {
    return { ok: false, error: "Tu rol no permite mover candidatos en el pipeline." };
  }

  const application = await deps.getApplication(input.applicationId, ctx.organizationId);
  if (!application) {
    return { ok: false, error: "Postulación no encontrada." };
  }

  if (application.stageId === input.toStageId) {
    return { ok: false, error: "El candidato ya está en esa etapa." };
  }

  if (application.stageKind && isClosingKind(application.stageKind)) {
    return { ok: false, error: "No se puede mover un candidato que ya está contratado." };
  }

  const stage = await deps.getStage(input.toStageId, ctx.organizationId);
  if (!stage) {
    return { ok: false, error: "Etapa no encontrada." };
  }

  if (stage.jobId !== application.jobId) {
    return { ok: false, error: "Esa etapa pertenece a otra búsqueda." };
  }

  await deps.moveToStage({
    applicationId: input.applicationId,
    toStageId: input.toStageId,
    legacyStage: legacyStageFor(stage),
  });

  return { ok: true };
}
