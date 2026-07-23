import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { screeningQuestions } from "@/db/schema";
import type { NormalizedScreeningQuestion } from "../domain/definir-preguntas-screening";

/**
 * Reemplaza el set de preguntas de una búsqueda por el que manda el recruiter, preservando
 * el `id` de las que ya existían (no las borra y reinserta) para no perder las respuestas ya
 * cargadas (`screening_answers.question_id`) — ver el comentario del caso de uso.
 */
export async function syncScreeningQuestions(
  jobId: string,
  organizationId: string,
  questions: NormalizedScreeningQuestion[],
): Promise<void> {
  const db = await getDb();
  await db.rls(async (tx) => {
    const existing = await tx
      .select({ id: screeningQuestions.id })
      .from(screeningQuestions)
      .where(and(eq(screeningQuestions.jobId, jobId), eq(screeningQuestions.organizationId, organizationId)));
    const existingIds = new Set(existing.map((r) => r.id));
    const keepIds = new Set(questions.filter((q) => q.id).map((q) => q.id!));

    const toDelete = [...existingIds].filter((id) => !keepIds.has(id));
    if (toDelete.length > 0) {
      await tx.delete(screeningQuestions).where(inArray(screeningQuestions.id, toDelete));
    }

    for (const q of questions) {
      if (q.id && existingIds.has(q.id)) {
        await tx
          .update(screeningQuestions)
          .set({
            type: q.type,
            label: q.label,
            options: q.options,
            required: q.required,
            position: q.position,
          })
          .where(eq(screeningQuestions.id, q.id));
      } else {
        await tx.insert(screeningQuestions).values({
          organizationId,
          jobId,
          type: q.type,
          label: q.label,
          options: q.options,
          required: q.required,
          position: q.position,
        });
      }
    }
  }, "db.screening.sync-questions");
}
