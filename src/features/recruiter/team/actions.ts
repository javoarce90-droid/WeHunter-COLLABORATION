"use server";

import { randomUUID } from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOwnProfile, getOrganization } from "@/features/recruiter/settings/data/settings.queries";
import {
  invitarMiembro,
  actualizarMiembro,
  eliminarMiembro,
  ASSIGNABLE_ROLES,
} from "./domain/gestionar-equipo";
import { aceptarInvitacion } from "./domain/aceptar-invitacion";
import {
  insertInvitation,
  revokeInvitation,
  updateMembership,
  deleteMembership,
  getInvitationByToken,
  findProfileByEmail,
  createAuthUser,
  createMembership,
  markInvitationAccepted,
} from "./data/team.mutations";
import { getMembershipById, getInvitationForResend } from "./data/team.queries";
import { sendInvitationEmail } from "./data/email-client";

const ROLE_ENUM = ASSIGNABLE_ROLES as unknown as [string, ...string[]];

/** URL base de la app a partir de los headers de la request (mismo patrón que
 *  `google-calendar/data/oauth-client.ts` y `app/auth/actions.ts`). */
async function appUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "";
}

export async function invitarMiembroAction(
  name: string,
  email: string,
  role: string,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Ingresá el nombre completo."),
      email: z.string().email("Email inválido."),
      role: z.enum(ROLE_ENUM),
    })
    .safeParse({ name, email, role });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const [membership, user] = await Promise.all([getActiveMembership(), getCurrentUser()]);
  if (!membership || !user) return { ok: false, error: "No autorizado." };

  const token = randomUUID();
  const result = await invitarMiembro(
    {
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role as (typeof ASSIGNABLE_ROLES)[number],
      token,
    },
    { userId: user.id, organizationId: membership.organizationId, role: membership.role },
    {
      createInvitation: (data) =>
        insertInvitation({ organizationId: membership.organizationId, ...data }),
    },
  );

  if (!result.ok) return { ok: false, error: result.error };

  const [inviter, org] = await Promise.all([
    getOwnProfile(),
    getOrganization(membership.organizationId),
  ]);
  // Best-effort: si SendGrid falla, la invitación queda igual creada — se puede "Reenviar".
  await sendInvitationEmail({
    to: parsed.data.email,
    inviterName: inviter?.fullName || inviter?.email || "Un miembro del equipo",
    organizationName: org?.name ?? "WeHunter",
    role: parsed.data.role as (typeof ASSIGNABLE_ROLES)[number],
    acceptUrl: `${await appUrl()}/invite/aceptar?token=${token}`,
  });

  revalidatePath("/team");
  return { ok: true };
}

export async function reenviarInvitacionAction(
  invitationId: string,
): Promise<{ ok: boolean; error?: string }> {
  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };
  if (membership.role !== "owner" && membership.role !== "admin") {
    return { ok: false, error: "Sin permisos." };
  }

  const invitation = await getInvitationForResend(invitationId, membership.organizationId);
  if (!invitation) return { ok: false, error: "Invitación no encontrada." };

  const [inviter, org] = await Promise.all([
    getOwnProfile(),
    getOrganization(membership.organizationId),
  ]);
  const sent = await sendInvitationEmail({
    to: invitation.email,
    inviterName: inviter?.fullName || inviter?.email || "Un miembro del equipo",
    organizationName: org?.name ?? "WeHunter",
    role: invitation.role,
    acceptUrl: `${await appUrl()}/invite/aceptar?token=${invitation.token}`,
  });
  if (!sent.ok) return { ok: false, error: sent.error };

  return { ok: true };
}

export async function actualizarMiembroAction(
  membershipId: string,
  patch: { role?: string; status?: string },
): Promise<{ ok: boolean; error?: string }> {
  const parsed = z
    .object({
      membershipId: z.string().uuid(),
      role: z.enum(ASSIGNABLE_ROLES as unknown as [string, ...string[]]).optional(),
      status: z.enum(["active", "inactive"]).optional(),
    })
    .safeParse({ membershipId, ...patch });
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const [membership, user] = await Promise.all([getActiveMembership(), getCurrentUser()]);
  if (!membership || !user) return { ok: false, error: "No autorizado." };

  const result = await actualizarMiembro(
    {
      membershipId: parsed.data.membershipId,
      role: parsed.data.role as "admin" | "recruiter" | "consultant" | undefined,
      status: parsed.data.status as "active" | "inactive" | undefined,
    },
    { userId: user.id, organizationId: membership.organizationId, role: membership.role },
    { getMembership: getMembershipById, updateMembership },
  );

  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/team");
  return { ok: true };
}

export async function eliminarMiembroAction(
  membershipId: string,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = z.object({ membershipId: z.string().uuid() }).safeParse({ membershipId });
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };

  const [membership, user] = await Promise.all([getActiveMembership(), getCurrentUser()]);
  if (!membership || !user) return { ok: false, error: "No autorizado." };

  const result = await eliminarMiembro(
    { membershipId: parsed.data.membershipId },
    { userId: user.id, organizationId: membership.organizationId, role: membership.role },
    { getMembership: getMembershipById, deleteMembership },
  );

  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/team");
  return { ok: true };
}

export async function revocarInvitacionAction(
  invitationId: string,
): Promise<{ ok: boolean; error?: string }> {
  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };
  if (membership.role !== "owner" && membership.role !== "admin") {
    return { ok: false, error: "Sin permisos." };
  }
  await revokeInvitation(invitationId, membership.organizationId);
  revalidatePath("/team");
  return { ok: true };
}

export interface AcceptInviteState {
  error?: string;
}

/**
 * Acepta una invitación. Sin sesión propia todavía (public route) — la posesión del token es
 * la autorización, no `getActiveMembership()`. Si la persona ya tenía cuenta, el dominio no
 * pide contraseña y no hay sesión para crear: se manda a `/login`. Si es cuenta nueva, se crea
 * y se loguea acá mismo antes del redirect.
 */
const acceptInviteSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").optional(),
    confirmPassword: z.string().optional(),
  })
  .refine((d) => !d.password || d.password === d.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export async function aceptarInvitacionAction(
  _prev: AcceptInviteState,
  formData: FormData,
): Promise<AcceptInviteState> {
  const parsed = acceptInviteSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password") || undefined,
    confirmPassword: formData.get("confirmPassword") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const result = await aceptarInvitacion(parsed.data, {
    getInvitationByToken,
    findProfileByEmail,
    createAuthUser,
    createMembership,
    markInvitationAccepted,
  });
  if (!result.ok) return { error: result.error };

  if (result.data.requiresLogin) {
    redirect("/login?joined=1");
  }

  // Cuenta recién creada: la logueamos para que entre directo, sin pedirle la clave de nuevo.
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: parsed.data.password!,
  });
  if (error) {
    redirect("/login?joined=1");
  }

  redirect("/dashboard");
}
