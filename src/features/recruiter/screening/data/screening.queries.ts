import { and, asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { screeningQuestions, screeningAnswers } from "@/db/schema";
import type { ScreeningQuestionType } from "../domain/definir-preguntas-screening";

export type ScreeningQuestionRow = {
  id: string;
  type: ScreeningQuestionType;
  label: string;
  options: string[] | null;
  required: boolean;
  position: number;
};

/** Preguntas de screening de una búsqueda, en orden de presentación. */
export async function listScreeningQuestionsByJob(
  jobId: string,
  organizationId: string,
): Promise<ScreeningQuestionRow[]> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          id: screeningQuestions.id,
          type: screeningQuestions.type,
          label: screeningQuestions.label,
          options: screeningQuestions.options,
          required: screeningQuestions.required,
          position: screeningQuestions.position,
        })
        .from(screeningQuestions)
        .where(and(eq(screeningQuestions.jobId, jobId), eq(screeningQuestions.organizationId, organizationId)))
        .orderBy(asc(screeningQuestions.position)),
    "db.screening.questions-by-job",
  );
  return rows.map((r) => ({ ...r, type: r.type as ScreeningQuestionType }));
}

export type ScreeningAnswerRow = {
  applicationId: string;
  questionId: string;
  questionLabel: string;
  questionType: ScreeningQuestionType;
  value: string;
};

/** Respuestas de screening de todas las postulaciones de una búsqueda, con el enunciado ya
 * resuelto (join a la pregunta) — así la UI no tiene que cruzar dos listas. */
export async function listScreeningAnswersByJob(
  jobId: string,
  organizationId: string,
): Promise<ScreeningAnswerRow[]> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          applicationId: screeningAnswers.applicationId,
          questionId: screeningAnswers.questionId,
          questionLabel: screeningQuestions.label,
          questionType: screeningQuestions.type,
          value: screeningAnswers.value,
        })
        .from(screeningAnswers)
        .innerJoin(screeningQuestions, eq(screeningAnswers.questionId, screeningQuestions.id))
        .where(and(eq(screeningQuestions.jobId, jobId), eq(screeningAnswers.organizationId, organizationId)))
        .orderBy(asc(screeningQuestions.position)),
    "db.screening.answers-by-job",
  );
  return rows.map((r) => ({ ...r, questionType: r.questionType as ScreeningQuestionType }));
}
