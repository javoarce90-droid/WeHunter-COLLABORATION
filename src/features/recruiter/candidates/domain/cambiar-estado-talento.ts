import type { OrgRole } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
export const TALENT_STATES = ["active", "passive", "contacted", "archived"] as const;
export type TalentState = (typeof TALENT_STATES)[number];

export type CambiarEstadoTalentoInput = {
  candidateId: string;
  talentState: TalentState;
};

export type CambiarEstadoTalentoContext = {
  organizationId: string;
  role: OrgRole;
};

export type CambiarEstadoTalentoDeps = {
  getCandidate: (
    candidateId: string,
    organizationId: string,
  ) => Promise<{ id: string } | null>;
  setState: (candidateId: string, talentState: TalentState) => Promise<void>;
};

/**
 * Cambia el estado operativo de un candidato en el pool (activo/pasivo/contactado/archivado).
 * Acción de gestión del pool: el consultor (acceso acotado) no la ejecuta.
 */
export async function cambiarEstadoTalento(
  input: CambiarEstadoTalentoInput,
  ctx: CambiarEstadoTalentoContext,
  deps: CambiarEstadoTalentoDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!can(ctx.role, "candidates.manage")) {
    return { ok: false, error: "Tu rol no permite gestionar el pool." };
  }

  const candidate = await deps.getCandidate(input.candidateId, ctx.organizationId);
  if (!candidate) {
    return { ok: false, error: "Candidato no encontrado." };
  }

  await deps.setState(input.candidateId, input.talentState);
  return { ok: true };
}
