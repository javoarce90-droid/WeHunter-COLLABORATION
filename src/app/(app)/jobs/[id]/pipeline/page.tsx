import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { getJobForPipeline, listApplicationsByJob } from "@/features/recruiter/applications/data/applications.queries";
import { listCandidates } from "@/features/recruiter/candidates/data/candidates.queries";
import { PipelineBoard } from "@/features/recruiter/applications/ui/PipelineBoard";
import { PostularForm } from "@/features/recruiter/applications/ui/PostularForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PipelinePage({ params }: Props) {
  const { id: jobId } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const job = await getJobForPipeline(jobId, membership.organizationId);
  if (!job) notFound();

  const [applications, candidates] = await Promise.all([
    listApplicationsByJob(jobId, membership.organizationId),
    listCandidates(membership.organizationId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm text-muted">
            <Link href="/jobs" className="hover:text-text">
              Búsquedas
            </Link>
            <span>/</span>
            <span>{job.title}</span>
          </div>
          <h1 className="font-display text-xl font-bold text-text">Pipeline</h1>
          <p className="text-sm text-muted">
            {applications.length} candidato{applications.length !== 1 ? "s" : ""} en proceso
          </p>
        </div>
        <PostularForm jobId={jobId} candidates={candidates} />
      </div>

      {/* Kanban */}
      <PipelineBoard applications={applications} />
    </div>
  );
}
