import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import {
  listApplicationsByJob,
  getJobStageCounts,
  listStageEventsByJob,
  type StageHistoryEvent,
} from "@/features/recruiter/applications/data/applications.queries";
import { listInterviewsByJob } from "@/features/recruiter/interviews/data/interviews.queries";
import { listMembers } from "@/features/recruiter/team/data/team.queries";
import { listNotesByJob, type TimelineNote } from "@/features/recruiter/notes/data/notes.queries";
import { listJobStages } from "@/features/recruiter/pipeline-stages/data/job-stages.queries";
import {
  listScreeningAnswersByJob,
  type ScreeningAnswerRow,
} from "@/features/recruiter/screening/data/screening.queries";
import type { InterviewRow } from "@/features/recruiter/interviews/domain/agendar-entrevista";
import { PipelineView } from "@/features/recruiter/applications/ui/PipelineView";
import { JobStageSettingsButton } from "@/features/recruiter/pipeline-stages/ui/JobStageSettingsButton";

interface Props {
  params: Promise<{ id: string }>;
}

/** Pestaña Pipeline. La cabecera (título + estado + breadcrumb) la pone el layout del workspace. */
export default async function PipelinePage({ params }: Props) {
  const { id: jobId } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const [applications, interviews, notes, stages, stageEvents, members, screeningAnswers, counts] =
    await Promise.all([
      listApplicationsByJob(jobId, membership.organizationId),
      listInterviewsByJob(jobId, membership.organizationId),
      listNotesByJob(jobId, membership.organizationId),
      listJobStages(jobId, membership.organizationId),
      listStageEventsByJob(jobId, membership.organizationId),
      listMembers(membership.organizationId),
      listScreeningAnswersByJob(jobId, membership.organizationId),
      getJobStageCounts(jobId, membership.organizationId),
    ]);
  const teamMembers = members
    .filter((m) => m.status === "active")
    .map((m) => ({ profileId: m.profileId, name: m.name, email: m.email }));

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
  const stageEventsByApplication = stageEvents.reduce<Record<string, StageHistoryEvent[]>>(
    (acc, e) => {
      (acc[e.applicationId] ??= []).push(e);
      return acc;
    },
    {},
  );
  const screeningAnswersByApplication = screeningAnswers.reduce<Record<string, ScreeningAnswerRow[]>>(
    (acc, a) => {
      (acc[a.applicationId] ??= []).push(a);
      return acc;
    },
    {},
  );

  return (
    <PipelineView
      jobId={jobId}
      applications={applications}
      pendientes={counts.pendientes}
      interviewsByApplication={interviewsByApplication}
      teamMembers={teamMembers}
      notesByApplication={notesByApplication}
      stageEventsByApplication={stageEventsByApplication}
      screeningAnswersByApplication={screeningAnswersByApplication}
      stages={stages}
      actions={<JobStageSettingsButton jobId={jobId} stages={stages} />}
    />
  );
}
