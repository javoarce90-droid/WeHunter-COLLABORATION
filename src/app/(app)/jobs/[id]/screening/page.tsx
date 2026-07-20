import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { getJobById } from "@/features/recruiter/jobs/data/jobs.queries";
import { listScreeningQuestionsByJob } from "@/features/recruiter/screening/data/screening.queries";
import { ScreeningStep } from "@/features/recruiter/screening/ui/ScreeningStep";
import type { ScreeningQuestionInput } from "@/features/recruiter/screening/domain/definir-preguntas-screening";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Paso de screening tras crear una búsqueda (manual o IA). El job ya está validado por el layout;
 * traemos las preguntas existentes por si el recruiter vuelve a este paso. Es opcional: desde acá
 * puede sumar preguntas o seguir de largo al aviso.
 */
export default async function ScreeningStepPage({ params }: Props) {
  const { id } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const [job, questions] = await Promise.all([
    getJobById(id, membership.organizationId),
    listScreeningQuestionsByJob(id, membership.organizationId),
  ]);
  if (!job) notFound();

  const initialQuestions: ScreeningQuestionInput[] = questions.map((q) => ({
    id: q.id,
    type: q.type,
    label: q.label,
    options: q.options ?? undefined,
    required: q.required,
  }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-display text-base font-bold text-text">Preguntas de screening</h2>
        <p className="mt-1 max-w-[65ch] text-sm text-muted">
          Búsqueda creada. Sumá preguntas que el candidato responde al postularse — te ayudan a
          conocerlo y filtrar antes de la entrevista. Es opcional: podés omitir este paso y hacerlo
          más tarde desde <span className="font-semibold text-text">Editar</span>.
        </p>
      </div>
      <ScreeningStep jobId={job.id} initialQuestions={initialQuestions} />
    </div>
  );
}
