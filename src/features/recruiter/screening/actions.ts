"use server";

import { z } from "zod";
import { getActiveMembership } from "@/lib/auth/session";
import { screeningQuestionSchema, screeningQuestionTypeSchema } from "@/features/recruiter/jobs/schema";
import { getJobById } from "@/features/recruiter/jobs/data/jobs.queries";
import { definirPreguntasScreening } from "./domain/definir-preguntas-screening";
import { syncScreeningQuestions } from "./data/screening.mutations";
import { getAiProvider, type DraftScreeningQuestion } from "@/lib/ai";

/** Misma forma que en el JobForm, pero sobre un array ya parseado (acá no llega como JSON). */
const questionsSchema = z.array(screeningQuestionSchema).max(20);

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

/**
 * Sugiere preguntas de screening con IA a partir del contenido ya cargado del aviso (mismos
 * campos que "Redactar con IA" del Aviso). El recruiter elige cuáles agregar en un modal — nunca
 * se guardan directo acá; el guardado real sigue pasando por `guardarScreeningAction`, que valida
 * la coherencia del criterio igual para preguntas manuales o generadas por IA.
 */
export async function generarPreguntasScreeningAction(
  jobId: string,
): Promise<{ ok: boolean; questions?: DraftScreeningQuestion[]; error?: string }> {
  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };

  const job = await getJobById(jobId, membership.organizationId);
  if (!job) return { ok: false, error: "Búsqueda no encontrada." };

  const draft = await getAiProvider().draftScreeningQuestions({
    title: job.title,
    objectives: job.objectives,
    requirements: job.requirements,
    responsibilities: job.responsibilities,
    skills: job.skills,
  });

  // Descarta tipos que no calcen con el enum real del dominio — mismo criterio que `jobArea`
  // en `generarBorradorAction` (se filtra en silencio, no aborta el resto de las sugerencias).
  const questions = draft.filter((q) => screeningQuestionTypeSchema.safeParse(q.type).success);
  if (questions.length === 0) {
    return { ok: false, error: "No se pudieron generar preguntas. Probá de nuevo." };
  }

  return { ok: true, questions };
}
