import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";
import type { DuplicateCandidateMatch } from "./duplicate-keys";
import type { LinkableProfile } from "./profile-link";

/**
 * Caso de uso de solo lectura: adelanta, apenas se tipea el email, el mismo chequeo que
 * `cargarCandidato` hace recién al enviar el form — así el recruiter se entera de un
 * posible duplicado o cuenta vinculable antes de completar el resto de los campos.
 * No crea ni cambia nada; el chequeo autoritativo sigue viviendo en `cargarCandidato`.
 */

export type VerificarCandidatoPorEmailCtx = {
  organizationId: string | null;
  role: OrgRole | null;
};

export type VerificarCandidatoPorEmailDeps = {
  findDuplicateCandidate(
    organizationId: string,
    args: { email: string | null; linkedinUrl: string | null },
  ): Promise<DuplicateCandidateMatch | null>;
  findLinkableProfile(email: string | null): Promise<LinkableProfile | null>;
};

export type VerificarCandidatoPorEmailResult = {
  duplicate?: DuplicateCandidateMatch;
  profileMatch?: true;
};

export async function verificarCandidatoPorEmail(
  email: string,
  ctx: VerificarCandidatoPorEmailCtx,
  deps: VerificarCandidatoPorEmailDeps,
): Promise<VerificarCandidatoPorEmailResult> {
  if (!ctx.organizationId || !ctx.role || !can(ctx.role, "candidates.manage")) {
    return {};
  }

  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    return {};
  }

  const duplicate = await deps.findDuplicateCandidate(ctx.organizationId, {
    email: trimmed,
    linkedinUrl: null,
  });
  if (duplicate) {
    return { duplicate };
  }

  const match = await deps.findLinkableProfile(trimmed);
  if (match) {
    return { profileMatch: true };
  }

  return {};
}
