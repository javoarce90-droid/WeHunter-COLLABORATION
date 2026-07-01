import { isClosingStage, STAGE_LABELS } from "../schema";
import type { RejectionReason } from "../schema";
import type { ApplicationRow } from "./postular-candidato";

// ---- Tipos del caso de uso ----

export type RechazarPostulacionInput = {
  applicationId: string;
  reason: RejectionReason;
  note?: string;
};

export type RechazarPostulacionContext = {
  userId: string;
  organizationId: string;
  role: "owner" | "admin" | "recruiter" | "consultant";
};

export type RechazarPostulacionDeps = {
  getApplicationById: (
    applicationId: string,
    organizationId: string,
  ) => Promise<ApplicationRow | null>;
  updateApplicationStage: (
    applicationId: string,
    fromStage: ApplicationRow["stage"],
    toStage: ApplicationRow["stage"],
    eventMeta?: { rejectionReason?: RejectionReason; rejectionNote?: string },
  ) => Promise<ApplicationRow>;
};

// ---- Caso de uso ----

/** Rechaza una postulación puntual, dejando motivo y nota (privados, solo recruiter)
 *  en el evento de historial. Mismas reglas de negocio que `moverEtapa` (rol, etapa
 *  de cierre): "rejected" no es de cierre, así que un candidato ya rechazado puede
 *  re-evaluarse y volver a rechazarse más adelante. */
export async function rechazarPostulacion(
  input: RechazarPostulacionInput,
  ctx: RechazarPostulacionContext,
  deps: RechazarPostulacionDeps,
): Promise<{ ok: true; data: ApplicationRow } | { ok: false; error: string }> {
  if (ctx.role === "consultant") {
    return { ok: false, error: "Los consultores no pueden rechazar candidatos." };
  }

  const application = await deps.getApplicationById(input.applicationId, ctx.organizationId);
  if (!application) {
    return { ok: false, error: "Postulación no encontrada." };
  }

  if (application.stage === "rejected") {
    return { ok: false, error: "El candidato ya está descartado." };
  }

  if (isClosingStage(application.stage)) {
    return {
      ok: false,
      error: `No se puede rechazar un candidato que ya está en etapa "${STAGE_LABELS[application.stage]}".`,
    };
  }

  const updated = await deps.updateApplicationStage(
    input.applicationId,
    application.stage,
    "rejected",
    { rejectionReason: input.reason, rejectionNote: input.note },
  );
  return { ok: true, data: updated };
}
