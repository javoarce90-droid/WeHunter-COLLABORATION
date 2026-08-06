import { notFound } from "next/navigation";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { listMembersPage, listPendingInvitations } from "@/features/recruiter/team/data/team.queries";
import { TeamSection } from "@/features/recruiter/team/ui/TeamSection";
import type { OrgRole } from "@/features/recruiter/team/domain/gestionar-equipo";
import { Pagination } from "@/components/ui/pagination";
import { parsePage, totalPages as calcTotalPages } from "@/lib/pagination";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const [user, membership, { page: rawPage }] = await Promise.all([
    getCurrentUser(),
    getActiveMembership(),
    searchParams,
  ]);
  if (!user || !membership) notFound();

  const page = parsePage(rawPage);
  const [{ members, total }, invitations] = await Promise.all([
    listMembersPage(membership.organizationId, page),
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
        workspaceType={membership.workspaceType}
      />
      <Pagination
        page={page}
        totalPages={calcTotalPages(total)}
        buildHref={(p) => `/team?page=${p}`}
      />
    </div>
  );
}
