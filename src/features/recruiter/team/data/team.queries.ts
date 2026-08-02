import { and, eq, desc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { memberships, profiles, invitations } from "@/db/schema";
import type { OrgRole, MembershipStatus } from "../domain/gestionar-equipo";

export type MemberRow = {
  membershipId: string;
  profileId: string;
  name: string | null;
  email: string;
  role: OrgRole;
  status: MembershipStatus;
};

export async function listMembers(organizationId: string): Promise<MemberRow[]> {
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
