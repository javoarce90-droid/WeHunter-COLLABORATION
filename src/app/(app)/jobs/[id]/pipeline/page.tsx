import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import {
  listApplicationsByJob,
  listCandidateIdsByJob,
  getJobStageCounts,
  getStageEntryTimes,
  listStageEventsByJob,
  type StageHistoryEvent,
} from "@/features/recruiter/applications/data/applications.queries";
import { listCandidates } from "@/features/recruiter/candidates/data/candidates.queries";
import { listInterviewsByJob } from "@/features/recruiter/interviews/data/interviews.queries";
import { listMembers } from "@/features/recruiter/team/data/team.queries";
import { listNotesByJob, type TimelineNote } from "@/features/recruiter/notes/data/notes.queries";
import { getPipelineStageConfigs } from "@/features/recruiter/pipeline-stages/data/pipeline-stages.queries";
import {
  listScreeningAnswersByJob,
  type ScreeningAnswerRow,
} from "@/features/recruiter/screening/data/screening.queries";
import type { InterviewRow } from "@/features/recruiter/interviews/domain/agendar-entrevista";
import { PipelineView } from "@/features/recruiter/applications/ui/PipelineView";
import { AgregarCandidatos } from "@/features/recruiter/applications/ui/AgregarCandidatos";
import { StageSettingsButton } from "@/features/recruiter/pipeline-stages/ui/StageSettingsButton";

interface Props {
  params: Promise<{ id: string }>;
}

/** Pestaña Pipeline. La cabecera (título + estado + breadcrumb) la pone el layout del workspace. */
export default async function PipelinePage({ params }: Props) {
  const { id: jobId } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const [
    applications,
    candidates,
    interviews,
    notes,
    stageConfig,
    stageEvents,
    members,
    screeningAnswers,
    counts,
    candidateIdsEnLaBusqueda,
  ] = await Promise.all([
      listApplicationsByJob(jobId, membership.organizationId),
      listCandidates(membership.organizationId),
      listInterviewsByJob(jobId, membership.organizationId),
      listNotesByJob(jobId, membership.organizationId),
      getPipelineStageConfigs(membership.organizationId),
      listStageEventsByJob(jobId, membership.organizationId),
      listMembers(membership.organizationId),
      listScreeningAnswersByJob(jobId, membership.organizationId),
      getJobStageCounts(jobId, membership.organizationId),
      listCandidateIdsByJob(jobId, membership.organizationId),
    ]);
  const teamMembers = members
    .filter((m) => m.status === "active")
    .map((m) => ({ profileId: m.profileId, name: m.name, email: m.email }));

  // getStageEntryTimes se hace después de tener las applications para poder hacer el fallback.
  const entryTimesFromEvents = await getStageEntryTimes(jobId, membership.organizationId);

  // Fallback: si un candidato nunca fue movido (sin evento), usamos su createdAt.
  const stageEntryTimes: Record<string, Date> = {};
  for (const app of applications) {
    stageEntryTimes[app.id] = entryTimesFromEvents[app.id] ?? app.createdAt;
  }

  // Para el alta contextual: el pool ofrece solo candidatos que NO están ya en esta búsqueda.
  const postuladosIds = new Set(candidateIdsEnLaBusqueda);
  const poolCandidates = candidates
    .filter((c) => !postuladosIds.has(c.id))
    .map((c) => ({ id: c.id, fullName: c.fullName, email: c.email }));

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
      stageConfig={stageConfig}
      stageEntryTimes={stageEntryTimes}
      actions={
        <>
          <StageSettingsButton stageConfig={stageConfig} />
          <AgregarCandidatos jobId={jobId} poolCandidates={poolCandidates} />
        </>
      }
    />
  );
}
