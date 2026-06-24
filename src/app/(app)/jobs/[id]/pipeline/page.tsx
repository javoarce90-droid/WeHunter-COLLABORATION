import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { listApplicationsByJob } from "@/features/recruiter/applications/data/applications.queries";
import { listCandidates } from "@/features/recruiter/candidates/data/candidates.queries";
import { listInterviewsByJob } from "@/features/recruiter/interviews/data/interviews.queries";
import { listNotesByJob, type TimelineNote } from "@/features/recruiter/notes/data/notes.queries";
import type { InterviewRow } from "@/features/recruiter/interviews/domain/agendar-entrevista";
import { PipelineView } from "@/features/recruiter/applications/ui/PipelineView";
import { PostularForm } from "@/features/recruiter/applications/ui/PostularForm";

interface Props {
  params: Promise<{ id: string }>;
}

/** Pestaña Pipeline. La cabecera (título + estado + breadcrumb) la pone el layout del workspace. */
export default async function PipelinePage({ params }: Props) {
  const { id: jobId } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const [applications, candidates, interviews, notes] = await Promise.all([
    listApplicationsByJob(jobId, membership.organizationId),
    listCandidates(membership.organizationId),
    listInterviewsByJob(jobId, membership.organizationId),
    listNotesByJob(jobId, membership.organizationId),
  ]);

  // Agrupamos entrevistas y notas por application en memoria (una sola query cada una).
  const interviewsByApplication = interviews.reduce<Record<string, InterviewRow[]>>(
    (acc, it) => {
      (acc[it.applicationId] ??= []).push(it);
      return acc;
    },
    {},
  );
  const notesByApplication = notes.reduce<Record<string, TimelineNote[]>>((acc, n) => {
    (acc[n.applicationId] ??= []).push(n);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {applications.length} candidato{applications.length !== 1 ? "s" : ""} en
          proceso
        </p>
        <PostularForm jobId={jobId} candidates={candidates} />
      </div>

      <PipelineView
        applications={applications}
        interviewsByApplication={interviewsByApplication}
        notesByApplication={notesByApplication}
      />
    </div>
  );
}
