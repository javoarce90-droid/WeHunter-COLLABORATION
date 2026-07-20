"use server";

import { z } from "zod";
import { getActiveMembership } from "@/lib/auth/session";
import { screeningQuestionTypeSchema } from "@/features/recruiter/jobs/schema";
import { getJobById } from "@/features/recruiter/jobs/data/jobs.queries";
import { definirPreguntasScreening } from "./domain/definir-preguntas-screening";
import { syncScreeningQuestions } from "./data/screening.mutations";

/** Mismas reglas que `screeningQuestionsField` (jobs/schema), pero sobre un array ya parseado. */
const questionsSchema = z
  .array(
    z.object({
      id: z.string().uuid().optional(),
      type: screeningQuestionTypeSchema,
      label: z.string().trim().max(200).default(""),
      options: z.array(z.string().trim().max(120)).max(10).optional(),
      required: z.boolean().default(true),
    }),
  )
  .max(20);

/**
 * Guarda las preguntas de screening de una búsqueda desde el paso post-creación (independiente
 * del JobForm). Es la misma llamada de dominio que hacen inline las actions de crear/editar.
 */
export async function guardarScreeningAction(
  jobId: string,
  questions: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = questionsSchema.safeParse(questions);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const membership = await getActiveMembership();
  const result = await definirPreguntasScreening(
    jobId,
    parsed.data,
    { organizationId: membership?.organizationId ?? null, role: membership?.role ?? null },
    { getJob: getJobById, syncQuestions: syncScreeningQuestions },
  );

  return result.ok ? { ok: true } : { ok: false, error: result.error };
}
