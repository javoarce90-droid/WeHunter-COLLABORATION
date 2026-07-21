import type { ScreeningQuestionType } from "./definir-preguntas-screening";

/**
 * Evaluación de los criterios de preselección de una búsqueda contra lo que respondió un
 * candidato. Función pura: la bandeja de Postulados la aplica en memoria sobre las preguntas
 * y respuestas que ya trajo la página, sin una query por postulación.
 *
 * Un criterio se cumple solo si hay respuesta Y la respuesta entra en lo esperado. Sin
 * responder = no cumple: el indicador dice "cuántos requisitos mínimos verificamos", y algo
 * que no sabemos no está verificado.
 */

export type CriterionQuestion = {
  id: string;
  type: ScreeningQuestionType;
  label: string;
  isCriterion: boolean;
  expectedValues: string[] | null;
  minValue: number | null;
  maxValue: number | null;
};

export type CriterionResult = {
  questionId: string;
  label: string;
  answer: string | null;
  cumple: boolean;
};

export type CriteriosEvaluados = {
  /** Criterios cumplidos sobre el total definido en el aviso. */
  cumplidos: number;
  total: number;
  detalle: CriterionResult[];
};

/** Compara ignorando mayúsculas, acentos y espacios sobrantes: el candidato escribe "si"
 *  donde el recruiter cargó "Sí" y sigue siendo la misma respuesta. */
function normalizar(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function cumpleCriterio(question: CriterionQuestion, answer: string | null): boolean {
  if (answer == null || answer.trim() === "") return false;

  if (question.type === "number") {
    // La respuesta se guarda como texto; si no es un número, el criterio no se puede verificar.
    const n = Number(answer.replace(",", ".").trim());
    if (!Number.isFinite(n)) return false;
    if (question.minValue != null && n < question.minValue) return false;
    if (question.maxValue != null && n > question.maxValue) return false;
    // Criterio numérico sin ningún límite cargado: no hay nada que verificar.
    return question.minValue != null || question.maxValue != null;
  }

  const esperadas = question.expectedValues ?? [];
  if (esperadas.length === 0) return false;
  return esperadas.some((e) => normalizar(e) === normalizar(answer));
}

export function evaluarCriterios(
  questions: CriterionQuestion[],
  answersByQuestionId: Record<string, string>,
): CriteriosEvaluados {
  const criterios = questions.filter((q) => q.isCriterion);

  const detalle = criterios.map((q) => {
    const answer = answersByQuestionId[q.id] ?? null;
    return { questionId: q.id, label: q.label, answer, cumple: cumpleCriterio(q, answer) };
  });

  return {
    cumplidos: detalle.filter((d) => d.cumple).length,
    total: criterios.length,
    detalle,
  };
}
