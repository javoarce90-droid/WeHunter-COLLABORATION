import { and, eq } from "drizzle-orm";
import { getDb, admin } from "@/db/client";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { invitations, memberships, profiles } from "@/db/schema";
import type { OrgRole, MembershipStatus } from "../domain/gestionar-equipo";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function insertInvitation(args: {
  organizationId: string;
  name: string;
  email: string;
  role: OrgRole;
  token: string;
}): Promise<void> {
  const { name, ...rest } = args;
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx.insert(invitations).values({
        ...rest,
        inviteeName: name,
        invitedBy: db.userId,
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      }),
    "db.team.insert-invitation",
  );
}

export async function revokeInvitation(
  invitationId: string,
  organizationId: string,
): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(invitations)
        .set({ status: "revoked", updatedAt: new Date() })
        .where(
          and(
            eq(invitations.id, invitationId),
            eq(invitations.organizationId, organizationId),
          ),
        ),
    "db.team.revoke-invitation",
  );
}

export async function updateMembership(
  membershipId: string,
  patch: { role?: OrgRole; status?: MembershipStatus },
): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(memberships)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(memberships.id, membershipId)),
    "db.team.update-membership",
  );
}

/** Owner/admin autenticado eliminando a otro miembro — va por RLS, no por el cliente admin. */
export async function deleteMembership(
  membershipId: string,
  organizationId: string,
): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .delete(memberships)
        .where(
          and(
            eq(memberships.id, membershipId),
            eq(memberships.organizationId, organizationId),
          ),
        ),
    "db.team.delete-membership",
  );
}

export type InvitationByToken = {
  id: string;
  organizationId: string;
  email: string;
  inviteeName: string | null;
  role: OrgRole;
  status: "pending" | "accepted" | "revoked";
  expiresAt: Date | null;
};

/**
 * Búsqueda por token para el flujo de aceptación — quien la pide todavía no tiene sesión
 * (no hay JWT para `db.rls()`), así que usa el cliente `admin` (bypass RLS). La posesión del
 * token, no un rol, es la autorización acá — mismo criterio que ya documenta `database.md`
 * para "tareas de sistema controladas" sin actor logueado.
 */
export async function getInvitationByToken(token: string): Promise<InvitationByToken | null> {
  const rows = await admin
    .select({
      id: invitations.id,
      organizationId: invitations.organizationId,
      email: invitations.email,
      inviteeName: invitations.inviteeName,
      role: invitations.role,
      status: invitations.status,
      expiresAt: invitations.expiresAt,
    })
    .from(invitations)
    .where(eq(invitations.token, token))
    .limit(1);
  return rows[0] ? { ...rows[0], role: rows[0].role as OrgRole } : null;
}

/** Mismo motivo que `getInvitationByToken`: sin sesión todavía, cliente `admin`. */
export async function findProfileByEmail(email: string): Promise<{ id: string } | null> {
  const rows = await admin
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.email, email))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Crea la cuenta de Supabase Auth para quien acepta una invitación (persona nueva, sin cuenta
 * todavía). `email_confirm: true` porque ya probó ser dueña del email al clickear el link
 * mandado a esa dirección — no hace falta un segundo mail de confirmación.
 */
export async function createAuthUser(args: {
  email: string;
  password: string;
  fullName: string | null;
}): Promise<{ id: string } | { error: string }> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email: args.email,
    password: args.password,
    email_confirm: true,
    // El trigger `handle_new_user` (migración 0027) lee `account_type`/`full_name` de acá;
    // sin `account_type` cae a su default "candidate" y la cuenta recién creada termina en
    // el onboarding de candidato en vez de `/dashboard` — todo miembro de una org es
    // "recruiter" (el tipo de cuenta, no el rol dentro de la org, que se setea aparte en
    // `memberships.role`). `full_name` viene del nombre cargado al invitar, así el miembro
    // no entra con el nombre vacío.
    user_metadata: { account_type: "recruiter", full_name: args.fullName },
  });
  if (error || !data.user) return { error: error?.message ?? "No se pudo crear la cuenta." };
  return { id: data.user.id };
}

/**
 * Alta de membership para quien acepta una invitación — todavía sin sesión propia (recién se
 * crea acá, o ya existe pero no está logueada en este request), por eso cliente `admin`.
 */
export async function createMembership(args: {
  organizationId: string;
  profileId: string;
  role: OrgRole;
}): Promise<void> {
  await admin.insert(memberships).values({ ...args, status: "active" });
}

export async function markInvitationAccepted(invitationId: string): Promise<void> {
  await admin
    .update(invitations)
    .set({ status: "accepted", updatedAt: new Date() })
    .where(eq(invitations.id, invitationId));
}
