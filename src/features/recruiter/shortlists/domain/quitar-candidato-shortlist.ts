import type { OrgRole } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";

/**
 * Caso de uso: sacar un candidato de una shortlist (botón "Quitar"). Borra solo el vínculo
 * `shortlist_candidates` — la postulación sigue en la búsqueda y en el pipeline. El feedback
 * y los comentarios del cliente sobre ese candidato EN ESTA shortlist se van por cascada
 * (son de la shortlist, no de la búsqueda). Autorización primaria: `shortlists.manage`.
 */

export type QuitarCandidatoShortlistInput = {
  shortlistCandidateId: string;
};

export type QuitarCandidatoShortlistContext = {
  organizationId: string;
  role: OrgRole;
};

export type QuitarCandidatoShortlistDeps = {
  getShortlistCandidateById: (
    shortlistCandidateId: string,
    organizationId: string,
  ) => Promise<{ id: string } | null>;
  removeShortlistCandidate: (
    shortlistCandidateId: string,
    organizationId: string,
  ) => Promise<{ removed: boolean }>;
};

export async function quitarCandidatoDeShortlist(
  input: QuitarCandidatoShortlistInput,
  ctx: QuitarCandidatoShortlistContext,
  deps: QuitarCandidatoShortlistDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!can(ctx.role, "shortlists.manage")) {
    return { ok: false, error: "Tu rol no permite gestionar shortlists." };
  }

  const sc = await deps.getShortlistCandidateById(
    input.shortlistCandidateId,
    ctx.organizationId,
  );
  if (!sc) {
    return { ok: false, error: "El candidato no está en esta shortlist." };
  }

  const { removed } = await deps.removeShortlistCandidate(
    input.shortlistCandidateId,
    ctx.organizationId,
  );
  if (!removed) {
    return { ok: false, error: "No se pudo quitar al candidato." };
  }

  return { ok: true };
}
