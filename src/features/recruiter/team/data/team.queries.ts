import { cache } from "react";
import { and, count, eq, desc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { memberships, profiles, invitations } from "@/db/schema";
import type { OrgRole, MembershipStatus } from "../domain/gestionar-equipo";
import { paginationRange } from "@/lib/pagination";

export type MemberRow = {
  membershipId: string;
  profileId: string;
  name: string | null;
  email: string;
  role: OrgRole;
  status: MembershipStatus;
};

/** Todos los miembros (hasta 100) — usado por selectores/pickers de otras pantallas
 *  (agenda, pipeline, shortlists, solicitudes) que necesitan la lista completa, no una página.
 *  `cache()`: el layout de `/jobs/[id]` y varias de sus tabs (ej. Shortlists) la piden en el
 *  mismo request — sin esto, cada una dispara su propia transacción `db.team.members`. */
export const listMembers = cache(async function listMembers(
  organizationId: string,
): Promise<MemberRow[]> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({
        membershipId: memberships.id,
        profileId: memberships.profileId,
        name: profiles.fullName,
        email: profiles.email,
        role: memberships.role,
        status: memberships.status,
      })
      .from(memberships)
      .innerJoin(profiles, eq(memberships.profileId, profiles.id))
      .where(eq(memberships.organizationId, organizationId))
      .orderBy(memberships.createdAt)
      .limit(100),
    "db.team.members",
  );
  return rows.map((r) => ({
    ...r,
    role: r.role as OrgRole,
    status: r.status as MembershipStatus,
  }));
});

/** Página de miembros para la tabla de `/team` (10 por página) — distinta de `listMembers`,
 *  que otras pantallas usan como selector y necesitan la lista completa. */
export async function listMembersPage(
  organizationId: string,
  page: number = 1,
): Promise<{ members: MemberRow[]; total: number }> {
  const db = await getDb();
  const { limit, offset } = paginationRange(page);
  const [rows, total] = await Promise.all([
    db.rls(
      (tx) =>
        tx
          .select({
            membershipId: memberships.id,
            profileId: memberships.profileId,
            name: profiles.fullName,
            email: profiles.email,
            role: memberships.role,
            status: memberships.status,
          })
          .from(memberships)
          .innerJoin(profiles, eq(memberships.profileId, profiles.id))
          .where(eq(memberships.organizationId, organizationId))
          .orderBy(memberships.createdAt)
          .limit(limit)
          .offset(offset),
      "db.team.members-page",
    ),
    db.rls(
      (tx) =>
        tx
          .select({ n: count() })
          .from(memberships)
          .where(eq(memberships.organizationId, organizationId))
          .then((r) => r[0]?.n ?? 0),
      "db.team.members-count",
    ),
  ]);
  return {
    members: rows.map((r) => ({ ...r, role: r.role as OrgRole, status: r.status as MembershipStatus })),
    total,
  };
}

/** Membership activo único de la org, sin importar el rol — usado para auto-asignar cuando no
 *  hay elección real (Freelance siempre, o un Team que todavía tiene un solo miembro). */
export async function getSoleActiveMembershipId(organizationId: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({ id: memberships.id })
        .from(memberships)
        .where(and(eq(memberships.organizationId, organizationId), eq(memberships.status, "active")))
        .limit(2),
    "db.team.sole-active-membership",
  );
  return rows.length === 1 ? rows[0]!.id : null;
}

/** Miembros activos + invitaciones pendientes de la org — lo que cuenta para el tope de plan
 *  (`canInviteMore`). Dos `count()` en la misma transacción, no dos `db.rls()` separados. */
export async function countMembersAndPendingInvitations(organizationId: string): Promise<number> {
  const db = await getDb();
  const [membersCount, pendingCount] = await db.rls(
    (tx) =>
      Promise.all([
        tx
          .select({ n: count() })
          .from(memberships)
          .where(eq(memberships.organizationId, organizationId))
          .then((r) => r[0]?.n ?? 0),
        tx
          .select({ n: count() })
          .from(invitations)
          .where(
            and(eq(invitations.organizationId, organizationId), eq(invitations.status, "pending")),
          )
          .then((r) => r[0]?.n ?? 0),
      ]),
    "db.team.count-members",
  );
  return membersCount + pendingCount;
}

export type InvitationRow = {
  id: string;
  name: string | null;
  email: string;
  role: OrgRole;
};

export async function listPendingInvitations(
  organizationId: string,
): Promise<InvitationRow[]> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({
        id: invitations.id,
        name: invitations.inviteeName,
        email: invitations.email,
        role: invitations.role,
      })
      .from(invitations)
      .where(
        and(
          eq(invitations.organizationId, organizationId),
          eq(invitations.status, "pending"),
        ),
      )
      .orderBy(desc(invitations.createdAt))
      .limit(100),
    "db.team.invitations",
  );
  return rows.map((r) => ({ ...r, role: r.role as OrgRole }));
}

/** Fila completa (con token) de una invitación pendiente, para reenviar el email — el
 *  caller ya está autenticado como owner/admin de esa org, así que va por RLS. */
export async function getInvitationForResend(
  invitationId: string,
  organizationId: string,
): Promise<{ email: string; role: OrgRole; token: string } | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({ email: invitations.email, role: invitations.role, token: invitations.token })
        .from(invitations)
        .where(
          and(
            eq(invitations.id, invitationId),
            eq(invitations.organizationId, organizationId),
          ),
        )
        .limit(1),
    "db.team.invitation-for-resend",
  );
  return rows[0] ? { ...rows[0], role: rows[0].role as OrgRole } : null;
}

export async function getMembershipById(
  membershipId: string,
  organizationId: string,
): Promise<{ id: string; role: OrgRole; profileId: string; status: MembershipStatus } | null> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({
        id: memberships.id,
        role: memberships.role,
        profileId: memberships.profileId,
        status: memberships.status,
      })
      .from(memberships)
      .where(and(eq(memberships.id, membershipId), eq(memberships.organizationId, organizationId)))
      .limit(1),
    "db.team.membership",
  );
  if (!rows[0]) return null;
  return { ...rows[0], role: rows[0].role as OrgRole };
}
