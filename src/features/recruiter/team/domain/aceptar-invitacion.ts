import type { OrgRole } from "@/lib/auth/session";

/**
 * A diferencia de `invitarMiembro`/`actualizarMiembro`, acá no hay chequeo de rol: la
 * autorización es poseer un token de invitación válido, pendiente y no vencido — mismo modelo
 * de confianza que el link de reset de contraseña.
 */

export type PendingInvitation = {
  id: string;
  organizationId: string;
  email: string;
  inviteeName: string | null;
  role: OrgRole;
  status: "pending" | "accepted" | "revoked";
  expiresAt: Date | null;
};

export type AceptarInvitacionInput = { token: string; password?: string };

export type AceptarInvitacionDeps = {
  getInvitationByToken: (token: string) => Promise<PendingInvitation | null>;
  /** Si la persona ya tiene cuenta (invitada a un segundo workspace), no se le pide contraseña. */
  findProfileByEmail: (email: string) => Promise<{ id: string } | null>;
  createAuthUser: (args: {
    email: string;
    password: string;
    fullName: string | null;
  }) => Promise<{ id: string } | { error: string }>;
  createMembership: (args: {
    organizationId: string;
    profileId: string;
    role: OrgRole;
  }) => Promise<void>;
  markInvitationAccepted: (invitationId: string) => Promise<void>;
};

export type AceptarInvitacionResult =
  | {
      ok: true;
      data: {
        email: string;
        /** true = perfil ya existía, no se creó sesión (tiene que loguearse con su clave). */
        requiresLogin: boolean;
      };
    }
  | { ok: false; error: string };

export async function aceptarInvitacion(
  input: AceptarInvitacionInput,
  deps: AceptarInvitacionDeps,
): Promise<AceptarInvitacionResult> {
  const invitation = await deps.getInvitationByToken(input.token);
  if (!invitation) {
    return { ok: false, error: "El link de invitación no es válido." };
  }
  if (invitation.status === "revoked") {
    return { ok: false, error: "Esta invitación fue revocada." };
  }
  if (invitation.status === "accepted") {
    return { ok: false, error: "Esta invitación ya fue usada." };
  }
  if (invitation.expiresAt && invitation.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: "El link de invitación venció." };
  }

  const existingProfile = await deps.findProfileByEmail(invitation.email);
  if (existingProfile) {
    await deps.createMembership({
      organizationId: invitation.organizationId,
      profileId: existingProfile.id,
      role: invitation.role,
    });
    await deps.markInvitationAccepted(invitation.id);
    return { ok: true, data: { email: invitation.email, requiresLogin: true } };
  }

  if (!input.password) {
    return { ok: false, error: "Falta la contraseña." };
  }

  const created = await deps.createAuthUser({
    email: invitation.email,
    password: input.password,
    fullName: invitation.inviteeName,
  });
  if ("error" in created) {
    return { ok: false, error: created.error };
  }

  await deps.createMembership({
    organizationId: invitation.organizationId,
    profileId: created.id,
    role: invitation.role,
  });
  await deps.markInvitationAccepted(invitation.id);
  return { ok: true, data: { email: invitation.email, requiresLogin: false } };
}
