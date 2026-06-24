import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { invitations, memberships } from "@/db/schema";
import type { OrgRole, MembershipStatus } from "../domain/gestionar-equipo";

export async function insertInvitation(args: {
  organizationId: string;
  email: string;
  role: OrgRole;
  token: string;
}): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) => tx.insert(invitations).values({ ...args, invitedBy: db.userId }),
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
