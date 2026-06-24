import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { listApplicationsByJob } from "@/features/recruiter/applications/data/applications.queries";
import { listCandidates } from "@/features/recruiter/candidates/data/candidates.queries";
import { listInterviewsByJob } from "@/features/recruiter/interviews/data/interviews.queries";
import type { InterviewRow } from "@/features/recruiter/interviews/domain/agendar-entrevista";
import { PipelineBoard } from "@/features/recruiter/applications/ui/PipelineBoard";
import { PostularForm } from "@/features/recruiter/applications/ui/PostularForm";

interface Props {
  params: Promise<{ id: string }>;
}

/** Pestaña Pipeline. La cabecera (título + estado + breadcrumb) la pone el layout del workspace. */
export default async function PipelinePage({ params }: Props) {
  const { id: jobId } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const [applications, candidates, interviews] = await Promise.all([
    listApplicationsByJob(jobId, membership.organizationId),
    listCandidates(membership.organizationId),
    listInterviewsByJob(jobId, membership.organizationId),
  ]);

  // Agrupamos las entrevistas por application en memoria (una sola query arriba).
  const interviewsByApplication = interviews.reduce<Record<string, InterviewRow[]>>(
    (acc, it) => {
      (acc[it.applicationId] ??= []).push(it);
      return acc;
    },
    {},
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {applications.length} candidato{applications.length !== 1 ? "s" : ""} en
          proceso
        </p>
        <PostularForm jobId={jobId} candidates={candidates} />
      </div>

      <PipelineBoard
        applications={applications}
        interviewsByApplication={interviewsByApplication}
      />
    </div>
  );
}
