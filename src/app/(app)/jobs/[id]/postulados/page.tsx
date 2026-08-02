import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { listPostulados } from "@/features/recruiter/applications/data/applications.queries";
import { getJobById } from "@/features/recruiter/jobs/data/jobs.queries";
import {
  listScreeningQuestionsByJob,
  listScreeningAnswersByJob,
} from "@/features/recruiter/screening/data/screening.queries";
import { evaluarCriterios } from "@/features/recruiter/screening/domain/evaluar-criterios";
import type { CriteriosEvaluados } from "@/features/recruiter/screening/domain/evaluar-criterios";
import { PostuladosTable } from "@/features/recruiter/applications/ui/PostuladosTable";

interface Props {
  params: Promise<{ id: string }>;
}

/** Pestaña Postulados: bandeja de entrada de la búsqueda. El job ya está validado por el layout.
 *  getJobById está cacheado por request (database.md #1): pedirlo de nuevo acá para el título
 *  (necesario al armar los mensajes al candidato) no agrega una transacción extra.
 *
 *  Las tres lecturas van en paralelo y los criterios se resuelven en memoria con
 *  `evaluarCriterios`: sin una query por postulación (database.md #6). */
export default async function PostuladosPage({ params }: Props) {
  const { id: jobId } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const [postulados, job, questions, answers] = await Promise.all([
    listPostulados(jobId, membership.organizationId),
    getJobById(jobId, membership.organizationId),
    listScreeningQuestionsByJob(jobId, membership.organizationId),
    listScreeningAnswersByJob(jobId, membership.organizationId),
  ]);
  if (!job) notFound();

  const answersByApplication = new Map<string, Record<string, string>>();
  for (const a of answers) {
    const bucket = answersByApplication.get(a.applicationId) ?? {};
    bucket[a.questionId] = a.value;
    answersByApplication.set(a.applicationId, bucket);
  }

  const criteriosByApplication: Record<string, CriteriosEvaluados> = {};
  for (const p of postulados) {
    criteriosByApplication[p.id] = evaluarCriterios(
      questions,
      answersByApplication.get(p.id) ?? {},
    );
  }

  const screeningByApplication: Record<
    string,
    { questionId: string; label: string; value: string }[]
  > = {};
  for (const a of answers) {
    (screeningByApplication[a.applicationId] ??= []).push({
      questionId: a.questionId,
      label: a.questionLabel,
      value: a.value,
    });
  }

  return (
    <PostuladosTable
      jobId={jobId}
      jobTitle={job.title}
      postulados={postulados}
      criteriosByApplication={criteriosByApplication}
      screeningByApplication={screeningByApplication}
      totalCriterios={questions.filter((q) => q.isCriterion).length}
    />
  );
}
