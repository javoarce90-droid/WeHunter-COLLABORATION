import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { getJobForPipeline, listApplicationsByJob } from "@/features/recruiter/applications/data/applications.queries";
import { STAGE_LABELS } from "@/features/recruiter/applications/schema";
import {
  listShortlistsByJob,
  listShortlistCandidates,
  listSharesByShortlist,
} from "@/features/recruiter/shortlists/data/shortlists.queries";
import { CrearShortlistForm } from "@/features/recruiter/shortlists/ui/CrearShortlistForm";
import { ShortlistCard } from "@/features/recruiter/shortlists/ui/ShortlistCard";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ShortlistsPage({ params }: Props) {
  const { id: jobId } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const job = await getJobForPipeline(jobId, membership.organizationId);
  if (!job) notFound();

  const [applications, summaries] = await Promise.all([
    listApplicationsByJob(jobId, membership.organizationId),
    listShortlistsByJob(jobId, membership.organizationId),
  ]);

  const candidateOptions = applications.map((a) => ({
    applicationId: a.id,
    fullName: a.candidate.fullName,
    stage: STAGE_LABELS[a.stage],
  }));

  // Para cada shortlist, traemos candidatos (con feedback) y sus enlaces.
  const shortlists = await Promise.all(
    summaries.map(async (sl) => {
      const [candidates, shares] = await Promise.all([
        listShortlistCandidates(sl.id, membership.organizationId),
        listSharesByShortlist(sl.id, membership.organizationId),
      ]);
      return { ...sl, candidates, shares };
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm text-muted">
            <Link href="/jobs" className="hover:text-text">
              Búsquedas
            </Link>
            <span>/</span>
            <span>{job.title}</span>
            <span>/</span>
            <Link href={`/jobs/${jobId}/pipeline`} className="hover:text-text">
              Pipeline
            </Link>
          </div>
          <h1 className="font-display text-xl font-bold text-text">Shortlists</h1>
          <p className="text-sm text-muted">
            Compartí una selección de candidatos con la empresa por un enlace seguro.
          </p>
        </div>
        <CrearShortlistForm jobId={jobId} candidates={candidateOptions} />
      </div>

      {shortlists.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border bg-surface p-10 text-center text-sm text-muted">
          Todavía no creaste shortlists para esta búsqueda. Armá uno seleccionando candidatos
          del pipeline.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {shortlists.map((sl) => (
            <ShortlistCard
              key={sl.id}
              shortlistId={sl.id}
              jobId={jobId}
              name={sl.name}
              candidates={sl.candidates}
              shares={sl.shares}
            />
          ))}
        </div>
      )}
    </div>
  );
}
