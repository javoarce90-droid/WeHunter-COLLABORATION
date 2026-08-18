import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { getPipelineBoardData } from "@/features/recruiter/applications/data/applications.queries";
import { listInterviewsByJob } from "@/features/recruiter/interviews/data/interviews.queries";
import { listMembers } from "@/features/recruiter/team/data/team.queries";
import type { TimelineNote } from "@/features/recruiter/notes/data/notes.queries";
import { ensureJobStages } from "@/features/recruiter/pipeline-stages/data/job-stages.mutations";
import { evaluarCriterios } from "@/features/recruiter/screening/domain/evaluar-criterios";
import type { CriteriosEvaluados } from "@/features/recruiter/screening/domain/evaluar-criterios";
import type { ScreeningAnswerLine } from "@/features/recruiter/applications/ui/PostuladoDetailSheet";
import type { InterviewRow } from "@/features/recruiter/interviews/domain/agendar-entrevista";
import { getJobById } from "@/features/recruiter/jobs/data/jobs.queries";
import {
  listTagsByCandidateIds,
  type CandidateTagRow,
} from "@/features/recruiter/candidates/data/tags.queries";
import { PipelineView } from "@/features/recruiter/applications/ui/PipelineView";

interface Props {
  params: Promise<{ id: string }>;
}

/** Pestaña Pipeline. La cabecera (título + estado + breadcrumb) la pone el layout del workspace.
 *  `getPipelineBoardData` trae postulaciones + notas + screening + conteos en UNA sola
 *  transacción (database.md #3). El historial de etapa NO se trae acá: solo lo usa el sheet
 *  de detalle de UNA postulación puntual, se pide bajo demanda al abrirlo. */
export default async function PipelinePage({ params }: Props) {
  const { id: jobId } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const [job, boardData, interviews, stages, members] = await Promise.all([
    getJobById(jobId, membership.organizationId),
    getPipelineBoardData(jobId, membership.organizationId),
    listInterviewsByJob(jobId, membership.organizationId),
    ensureJobStages(jobId, membership.organizationId),
    listMembers(membership.organizationId),
  ]);
  if (!job) notFound();

  const { applications, notes, questions, answers: screeningAnswers, counts } = boardData;

  // Depende de `applications` (los candidateId), así que va después del Promise.all de
  // arriba — pero sigue siendo UNA sola query bulk para todo el tablero, no N+1.
  const tags = await listTagsByCandidateIds(
    applications.map((a) => a.candidate.id),
    membership.organizationId,
  );
  const tagsByCandidate = tags.reduce<Record<string, CandidateTagRow[]>>((acc, t) => {
    (acc[t.candidateId] ??= []).push({ id: t.id, name: t.name });
    return acc;
  }, {});

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
  const answersByApplication = new Map<string, Record<string, string>>();
  for (const a of screeningAnswers) {
    const bucket = answersByApplication.get(a.applicationId) ?? {};
    bucket[a.questionId] = a.value;
    answersByApplication.set(a.applicationId, bucket);
  }
  const criteriosByApplication: Record<string, CriteriosEvaluados> = {};
  for (const app of applications) {
    criteriosByApplication[app.id] = evaluarCriterios(
      questions,
      answersByApplication.get(app.id) ?? {},
    );
  }
  const screeningByApplication: Record<string, ScreeningAnswerLine[]> = {};
  for (const a of screeningAnswers) {
    (screeningByApplication[a.applicationId] ??= []).push({
      questionId: a.questionId,
      label: a.questionLabel,
      value: a.value,
    });
  }

  return (
    <PipelineView
      jobId={jobId}
      jobTitle={job.title}
      applications={applications}
      pendientes={counts.pendientes}
      interviewsByApplication={interviewsByApplication}
      teamMembers={teamMembers}
      notesByApplication={notesByApplication}
      criteriosByApplication={criteriosByApplication}
      screeningByApplication={screeningByApplication}
      tagsByCandidate={tagsByCandidate}
      stages={stages}
      canConfigureStages={can(membership.role, "stages.configure")}
    />
  );
}
