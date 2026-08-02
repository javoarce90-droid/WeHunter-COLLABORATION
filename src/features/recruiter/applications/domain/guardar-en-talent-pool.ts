import type { RejectionReason } from "../schema";
import { rechazarPostulacion } from "./rechazar-postulacion";
import type { RechazarPostulacionDeps } from "./rechazar-postulacion";
import type { ApplicationRow } from "./postular-candidato";
import type { TalentState } from "@/features/recruiter/candidates/domain/cambiar-estado-talento";
import type { OrgRole } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";

// ---- Tipos del caso de uso ----

export type GuardarEnTalentPoolInput = {
  applicationId: string;
  /** Nota interna del recruiter sobre por qué lo guarda (queda en el evento del descarte). */
  note?: string;
};

export type GuardarEnTalentPoolContext = {
  userId: string;
  organizationId: string;
  role: OrgRole;
};

export type GuardarEnTalentPoolDeps = RechazarPostulacionDeps & {
  setTalentState: (candidateId: string, talentState: TalentState) => Promise<void>;
};

/** Motivo con el que se cierra la postulación al guardar en el pool: no es un "no" al
 *  candidato, es un "no para esta búsqueda". */
const MOTIVO: RejectionReason = "perfil_no_ajusta";

// ---- Caso de uso ----

/**
 * "Guardar en Talent Pool" desde la bandeja de Postulados: el candidato sale de ESTA búsqueda
 * pero queda marcado como talento disponible para futuras. Son dos efectos que van juntos —
 * si solo se descartara, se perdería la intención de reconsiderarlo; si solo se marcara, la
 * postulación quedaría abierta esperando una decisión que ya se tomó.
 *
 * El orden importa: primero se cierra la postulación (es lo que puede fallar por reglas de
 * negocio — etapa de cierre, ya descartado) y recién después se marca el pool.
 */
export async function guardarEnTalentPool(
  input: GuardarEnTalentPoolInput,
  ctx: GuardarEnTalentPoolContext,
  deps: GuardarEnTalentPoolDeps,
): Promise<{ ok: true; data: ApplicationRow } | { ok: false; error: string }> {
  if (!can(ctx.role, "pipeline.move")) {
    return { ok: false, error: "Tu rol no permite gestionar el pool." };
  }

  const cerrada = await rechazarPostulacion(
    { applicationId: input.applicationId, reason: MOTIVO, note: input.note },
    ctx,
    deps,
  );
  if (!cerrada.ok) return cerrada;

  await deps.setTalentState(cerrada.data.candidateId, "active");
  return { ok: true, data: cerrada.data };
}
