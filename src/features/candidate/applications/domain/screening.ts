/**
 * Pregunta de screening tal como la ve un candidato al postularse. Definida una sola vez
 * (conventions.md) y compartida por los dos flujos de postulación: el Career Site público
 * (`ApplyForm`) y la postulación rápida del portal (`ApplicationModal`).
 *
 * Espeja `screening_questions` del schema, sin los campos internos (organization_id, job_id,
 * position) que el candidato no necesita.
 */
export type ScreeningQuestion = {
  id: string;
  type: "yes_no" | "text" | "number" | "multiple_choice";
  label: string;
  options: string[] | null;
  required: boolean;
};

/** Preguntas obligatorias sin respuesta (o en blanco). Vacío = se puede postular. */
export function obligatoriasSinResponder(
  questions: ScreeningQuestion[],
  answers: Record<string, string>,
): ScreeningQuestion[] {
  return questions.filter((q) => q.required && !answers[q.id]?.trim());
}
