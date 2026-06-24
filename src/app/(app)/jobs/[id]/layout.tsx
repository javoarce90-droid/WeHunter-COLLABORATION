import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { getJobById } from "@/features/recruiter/jobs/data/jobs.queries";
import { JobTabs } from "@/features/recruiter/jobs/ui/JobTabs";
import { JOB_STATUS_META, relativeTime } from "@/features/recruiter/jobs/ui/status-meta";
import { Badge } from "@/components/ui/badge";

/**
 * Shell del workspace de una búsqueda: cabecera única (breadcrumb + título + estado) y pestañas.
 * Garantiza que el job exista y pertenezca a la org; las páginas hijas confían en esa garantía
 * (no vuelven a traer el job, evitando transacciones RLS duplicadas — database.md #3).
 */
export default async function JobLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const job = await getJobById(id, membership.organizationId);
  if (!job) notFound();

  const meta = JOB_STATUS_META[job.status];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <nav
          aria-label="Migas de pan"
          className="flex items-center gap-1.5 text-sm text-muted"
        >
          <Link href="/jobs" className="hover:text-text">
            Búsquedas
          </Link>
          <span aria-hidden>/</span>
          <span className="truncate text-text">{job.title}</span>
        </nav>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="font-display text-xl font-bold text-text">
            {job.title}
          </h1>
          <Badge variant={meta.variant}>{meta.label}</Badge>
          <span className="text-xs text-muted">
            Actualizada {relativeTime(job.updatedAt)}
          </span>
        </div>
      </div>

      <JobTabs jobId={job.id} />

      <div>{children}</div>
    </div>
  );
}
