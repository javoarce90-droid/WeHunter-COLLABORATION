import type { ApplicationStage } from "../schema";
import type { ApplicationRow } from "./postular-candidato";

// Etapas terminales: no se puede avanzar desde ellas
const TERMINAL_STAGES: ApplicationStage[] = ["hired", "rejected"];

// ---- Tipos del caso de uso ----

export type MoverEtapaInput = {
  applicationId: string;
  newStage: ApplicationStage;
};

export type MoverEtapaContext = {
  userId: string;
  organizationId: string;
  role: "owner" | "admin" | "recruiter" | "consultant";
};

export type MoverEtapaDeps = {
  getApplicationById: (
    applicationId: string,
    organizationId: string,
  ) => Promise<ApplicationRow | null>;
  updateApplicationStage: (
    applicationId: string,
    fromStage: ApplicationStage,
    toStage: ApplicationStage,
  ) => Promise<ApplicationRow>;
};

// ---- Caso de uso ----

export async function moverEtapa(
  input: MoverEtapaInput,
  ctx: MoverEtapaContext,
  deps: MoverEtapaDeps,
): Promise<{ ok: true; data: ApplicationRow } | { ok: false; error: string }> {
  if (ctx.role === "consultant") {
    return { ok: false, error: "Los consultores no pueden mover candidatos en el pipeline." };
  }

  const application = await deps.getApplicationById(input.applicationId, ctx.organizationId);
  if (!application) {
    return { ok: false, error: "Postulación no encontrada." };
  }

  if (application.stage === input.newStage) {
    return { ok: false, error: "El candidato ya está en esa etapa." };
  }

  // No se puede salir de una etapa terminal (hired/rejected)
  if (TERMINAL_STAGES.includes(application.stage)) {
    return {
      ok: false,
      error: `No se puede mover un candidato que ya está en etapa "${application.stage}".`,
    };
  }

  const updated = await deps.updateApplicationStage(
    input.applicationId,
    application.stage, // fromStage = etapa actual antes del cambio
    input.newStage,
  );
  return { ok: true, data: updated };
}
