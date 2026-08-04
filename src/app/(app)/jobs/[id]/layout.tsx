import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import {
  getJobById,
  getJobAssignees,
  getOrganizationSlug,
} from "@/features/recruiter/jobs/data/jobs.queries";
import {
  RESPONSABLE_ROLES,
  canAssignResponsable,
  canAssignSourcer,
} from "@/features/recruiter/jobs/domain/gestionar-responsables";
import { listMembers } from "@/features/recruiter/team/data/team.queries";
import { JobTabs } from "@/features/recruiter/jobs/ui/JobTabs";
import { JobAssigneesHeader } from "@/features/recruiter/jobs/ui/JobAssigneesHeader";
import { ShareJobButton } from "@/features/recruiter/jobs/ui/ShareJobButton";
import { EstadoAvisoControl } from "@/features/recruiter/jobs/ui/EstadoAvisoControl";
import { JOB_STATUS_META, relativeTime } from "@/features/recruiter/jobs/ui/status-meta";
import { Badge } from "@/components/ui/badge";

/**
 * Shell del workspace de una búsqueda: cabecera única (breadcrumb + título + estado +
 * Compartir + Responsable/Sourcer) y pestañas. Garantiza que el job exista y pertenezca a la
 * org; las páginas hijas confían en esa garantía (no vuelven a traer el job, evitando
 * transacciones RLS duplicadas — database.md #3).
 */
export default async function JobLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!user || !membership) notFound();

  const job = await getJobById(id, membership.organizationId);
  if (!job) notFound();

  const [assignees, members, orgSlug] = await Promise.all([
    getJobAssignees(id, membership.organizationId),
    listMembers(membership.organizationId),
    getOrganizationSlug(membership.organizationId),
  ]);
  if (!assignees) notFound();

  const meta = JOB_STATUS_META[job.status];
  const canAssignResp = canAssignResponsable(membership.role, membership.workspaceType);
  const canAssignSrc = canAssignSourcer(membership.role, membership.workspaceType);
  const activeMembers = members.filter((m) => m.status === "active");
  const eligibleResponsibles = activeMembers
    .filter((m) => RESPONSABLE_ROLES.includes(m.role))
    .map((m) => ({ membershipId: m.membershipId, name: m.name, email: m.email }));
  const eligibleSourcers = activeMembers
    .filter((m) => m.role === "sourcer")
    .map((m) => ({ membershipId: m.membershipId, name: m.name, email: m.email }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <nav
          aria-label="Migas de pan"
          className="flex items-center gap-1.5 text-sm text-muted"
        >
          <Link
            href="/jobs"
            className="rounded-sm outline-none hover:text-text focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            Búsquedas
          </Link>
          <span aria-hidden>/</span>
          <span className="truncate text-text">{job.title}</span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="font-display text-xl font-bold text-text">{job.title}</h1>
            <Badge variant={meta.variant}>{meta.label}</Badge>
            <span className="text-xs text-muted">
              Actualizada {relativeTime(job.updatedAt)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <EstadoAvisoControl job={job} />
            {job.status === "open" && <ShareJobButton jobId={job.id} orgSlug={orgSlug} />}
          </div>
        </div>
      </div>

      <JobAssigneesHeader
        jobId={job.id}
        responsible={assignees.responsible}
        sourcer={assignees.sourcer}
        eligibleResponsibles={eligibleResponsibles}
        eligibleSourcers={eligibleSourcers}
        canAssignResponsable={canAssignResp}
        canAssignSourcer={canAssignSrc}
      />

      <JobTabs jobId={job.id} />

      <div>{children}</div>
    </div>
  );
}
