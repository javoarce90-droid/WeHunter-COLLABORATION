import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";

/**
 * Caso de uso: el recruiter comparte un shortlist con un Hiring Manager interno de la org
 * (§9 backlog, "compartida con un HM puntual") — alternativa a `generarShare` (link mágico
 * para un Cliente externo sin cuenta). El HM ya tiene sesión: no hace falta token, solo
 * registrar la relación para que su vista de "Shortlists compartidas conmigo" la encuentre.
 */

export type CompartirConHMInput = {
  shortlistId: string;
  membershipId: string;
};

export type CompartirConHMCtx = {
  userId: string;
  organizationId: string;
  role: OrgRole;
};

type EligibleMembership = {
  id: string;
  role: OrgRole;
  status: "active" | "inactive";
};

export type CompartirConHMDeps = {
  getShortlistById: (
    shortlistId: string,
    organizationId: string,
  ) => Promise<{ id: string } | null>;
  getMembership: (
    membershipId: string,
    organizationId: string,
  ) => Promise<EligibleMembership | null>;
  generateToken: () => string;
  createShareForMembership: (data: {
    organizationId: string;
    shortlistId: string;
    token: string;
    sharedWithMembershipId: string;
    createdBy: string;
  }) => Promise<{ shareId: string }>;
};

export async function compartirConHM(
  input: CompartirConHMInput,
  ctx: CompartirConHMCtx,
  deps: CompartirConHMDeps,
): Promise<{ ok: true; data: { shareId: string } } | { ok: false; error: string }> {
  if (!can(ctx.role, "shortlists.manage")) {
    return { ok: false, error: "Tu rol no permite compartir shortlists." };
  }

  const shortlist = await deps.getShortlistById(input.shortlistId, ctx.organizationId);
  if (!shortlist) {
    return { ok: false, error: "Shortlist no encontrado." };
  }

  const hm = await deps.getMembership(input.membershipId, ctx.organizationId);
  if (!hm) {
    return { ok: false, error: "Ese miembro no existe en la organización." };
  }
  if (hm.status !== "active") {
    return { ok: false, error: "No podés compartirlo con un miembro inactivo." };
  }
  if (hm.role !== "hiring_manager") {
    return { ok: false, error: "Solo se puede compartir internamente con un Hiring Manager." };
  }

  const token = deps.generateToken();
  const result = await deps.createShareForMembership({
    organizationId: ctx.organizationId,
    shortlistId: input.shortlistId,
    token,
    sharedWithMembershipId: input.membershipId,
    createdBy: ctx.userId,
  });

  return { ok: true, data: result };
}
