import { notFound } from "next/navigation";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { listMembers, listPendingInvitations } from "@/features/recruiter/team/data/team.queries";
import { TeamSection } from "@/features/recruiter/team/ui/TeamSection";
import type { OrgRole } from "@/features/recruiter/team/domain/gestionar-equipo";

export default async function TeamPage() {
  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!user || !membership) notFound();

  const [members, invitations] = await Promise.all([
    listMembers(membership.organizationId),
    listPendingInvitations(membership.organizationId),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-bold text-text">Equipo</h1>
        <p className="text-sm text-muted">
          Invitá miembros, asigná roles y activá o desactivá accesos.
        </p>
      </div>

      <TeamSection
        members={members}
        invitations={invitations}
        currentRole={membership.role as OrgRole}
        currentUserId={user.id}
      />
    </div>
  );
}
