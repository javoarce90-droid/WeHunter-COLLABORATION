export const TALENT_STATES = ["active", "passive", "contacted", "archived"] as const;
export type TalentState = (typeof TALENT_STATES)[number];

export type CambiarEstadoTalentoInput = {
  candidateId: string;
  talentState: TalentState;
};

export type CambiarEstadoTalentoContext = {
  organizationId: string;
  role: "owner" | "admin" | "recruiter" | "consultant";
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
  if (ctx.role === "consultant") {
    return { ok: false, error: "Los consultores no pueden gestionar el pool." };
  }

  const candidate = await deps.getCandidate(input.candidateId, ctx.organizationId);
  if (!candidate) {
    return { ok: false, error: "Candidato no encontrado." };
  }

  await deps.setState(input.candidateId, input.talentState);
  return { ok: true };
}
