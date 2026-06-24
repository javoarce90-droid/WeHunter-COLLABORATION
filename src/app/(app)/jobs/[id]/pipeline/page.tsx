import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { listApplicationsByJob, getStageEntryTimes } from "@/features/recruiter/applications/data/applications.queries";
import { listCandidates } from "@/features/recruiter/candidates/data/candidates.queries";
import { listInterviewsByJob } from "@/features/recruiter/interviews/data/interviews.queries";
import { listNotesByJob, type TimelineNote } from "@/features/recruiter/notes/data/notes.queries";
import { getPipelineStageConfigs } from "@/features/recruiter/pipeline-stages/data/pipeline-stages.queries";
import type { InterviewRow } from "@/features/recruiter/interviews/domain/agendar-entrevista";
import { PipelineView } from "@/features/recruiter/applications/ui/PipelineView";
import { PostularForm } from "@/features/recruiter/applications/ui/PostularForm";
import { StageSettingsButton } from "@/features/recruiter/pipeline-stages/ui/StageSettingsButton";

interface Props {
  params: Promise<{ id: string }>;
}

/** Pestaña Pipeline. La cabecera (título + estado + breadcrumb) la pone el layout del workspace. */
export default async function PipelinePage({ params }: Props) {
  const { id: jobId } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const [applications, candidates, interviews, notes, stageConfig] = await Promise.all([
    listApplicationsByJob(jobId, membership.organizationId),
    listCandidates(membership.organizationId),
    listInterviewsByJob(jobId, membership.organizationId),
    listNotesByJob(jobId, membership.organizationId),
    getPipelineStageConfigs(membership.organizationId),
  ]);

  // getStageEntryTimes se hace después de tener las applications para poder hacer el fallback.
  const entryTimesFromEvents = await getStageEntryTimes(jobId, membership.organizationId);

  // Fallback: si un candidato nunca fue movido (sin evento), usamos su createdAt.
  const stageEntryTimes: Record<string, Date> = {};
  for (const app of applications) {
    stageEntryTimes[app.id] = entryTimesFromEvents[app.id] ?? app.createdAt;
  }

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
        <div className="flex items-center gap-2">
          <StageSettingsButton stageConfig={stageConfig} />
          <PostularForm jobId={jobId} candidates={candidates} />
        </div>
      </div>

      <PipelineView
        applications={applications}
        interviewsByApplication={interviewsByApplication}
        notesByApplication={notesByApplication}
        stageConfig={stageConfig}
        stageEntryTimes={stageEntryTimes}
      />
    </div>
  );
}
