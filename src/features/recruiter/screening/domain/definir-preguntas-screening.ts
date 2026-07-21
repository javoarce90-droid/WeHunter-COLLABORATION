import { ok, err, type Result } from "@/lib/result";
import { canManageRecruiting } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";

/**
 * Caso de uso: definir las preguntas de screening de una búsqueda (§6 backlog). El recruiter
 * manda la lista completa deseada (mismo patrón que `benefits` en JobForm); acá se valida y
 * normaliza, y la sincronización real (qué se actualiza/crea/borra) vive en `data/` porque
 * necesita comparar contra lo que ya existe en la base — ver `syncQuestions`.
 *
 * Las preguntas con `id` (ya existentes) mantienen su identidad al guardarse, así no se
 * pierden las respuestas ya cargadas por candidatos (`screening_answers` cuelga de
 * `question_id`). Las que el recruiter borra del form sí se borran de la base — y con ellas,
 * en cascada, las respuestas que tuvieran (comportamiento esperado: si la pregunta ya no
 * existe, su respuesta tampoco tiene sentido).
 */

export type ScreeningQuestionType = "yes_no" | "text" | "number" | "multiple_choice";

export interface ScreeningQuestionInput {
  id?: string;
  type: ScreeningQuestionType;
  label: string;
  options?: string[];
  required: boolean;
  /** Marca la pregunta como criterio de preselección: su respuesta se evalúa. */
  isCriterion?: boolean;
  /** Respuestas válidas (sí/no y opción múltiple). */
  expectedValues?: string[] | null;
  /** Rango válido (preguntas numéricas). */
  minValue?: number | null;
  maxValue?: number | null;
}

export interface NormalizedScreeningQuestion {
  id?: string;
  type: ScreeningQuestionType;
  label: string;
  options: string[] | null;
  required: boolean;
  position: number;
  isCriterion: boolean;
  expectedValues: string[] | null;
  minValue: number | null;
  maxValue: number | null;
}

export interface DefinirPreguntasScreeningCtx {
  organizationId: string | null;
  role: OrgRole | null;
}

export interface DefinirPreguntasScreeningDeps {
  getJob: (jobId: string, organizationId: string) => Promise<{ id: string } | null>;
  syncQuestions: (
    jobId: string,
    organizationId: string,
    questions: NormalizedScreeningQuestion[],
  ) => Promise<void>;
}

const MAX_QUESTIONS = 20;

type CriterioNormalizado = Pick<
  NormalizedScreeningQuestion,
  "isCriterion" | "expectedValues" | "minValue" | "maxValue"
>;

const SIN_CRITERIO: CriterioNormalizado = {
  isCriterion: false,
  expectedValues: null,
  minValue: null,
  maxValue: null,
};

/**
 * Valida y normaliza la parte "criterio de preselección" de una pregunta.
 * Devuelve el mensaje de error como string cuando la configuración no cierra.
 */
function normalizarCriterio(
  q: ScreeningQuestionInput,
  options: string[] | null,
): CriterioNormalizado | string {
  if (!q.isCriterion) return SIN_CRITERIO;

  if (q.type === "text") {
    return "una pregunta de texto no puede ser criterio de preselección.";
  }

  if (q.type === "number") {
    const min = q.minValue ?? null;
    const max = q.maxValue ?? null;
    if (min == null && max == null) {
      return "como criterio numérico necesita un mínimo o un máximo.";
    }
    if (min != null && max != null && min > max) {
      return "el mínimo no puede ser mayor que el máximo.";
    }
    return { isCriterion: true, expectedValues: null, minValue: min, maxValue: max };
  }

  const esperadas = (q.expectedValues ?? []).map((v) => v.trim()).filter(Boolean);
  if (esperadas.length === 0) {
    return "como criterio necesita al menos una respuesta esperada.";
  }
  if (q.type === "multiple_choice") {
    const validas = new Set(options ?? []);
    const huerfana = esperadas.find((e) => !validas.has(e));
    if (huerfana) {
      return `la respuesta esperada "${huerfana}" ya no es una de las opciones.`;
    }
  }
  return { isCriterion: true, expectedValues: esperadas, minValue: null, maxValue: null };
}

export async function definirPreguntasScreening(
  jobId: string,
  questions: ScreeningQuestionInput[],
  ctx: DefinirPreguntasScreeningCtx,
  deps: DefinirPreguntasScreeningDeps,
): Promise<Result<void>> {
  if (!ctx.organizationId || !ctx.role) {
    return err("Necesitás estar autenticado en un workspace.");
  }
  if (!canManageRecruiting(ctx.role)) {
    return err("No tenés permisos para configurar el screening.");
  }
  if (questions.length > MAX_QUESTIONS) {
    return err(`No podés cargar más de ${MAX_QUESTIONS} preguntas.`);
  }

  const job = await deps.getJob(jobId, ctx.organizationId);
  if (!job) {
    return err("Búsqueda no encontrada.");
  }

  const normalized: NormalizedScreeningQuestion[] = [];
  for (const [i, q] of questions.entries()) {
    const label = q.label.trim();
    if (!label) continue; // se descarta en silencio, igual que un beneficio vacío

    let options: string[] | null = null;
    if (q.type === "multiple_choice") {
      options = (q.options ?? []).map((o) => o.trim()).filter(Boolean);
      if (options.length < 2) {
        return err(`La pregunta "${label}" necesita al menos 2 opciones.`);
      }
    }

    const criterio = normalizarCriterio(q, options);
    if (typeof criterio === "string") {
      return err(`La pregunta "${label}": ${criterio}`);
    }

    normalized.push({
      id: q.id,
      type: q.type,
      label,
      options,
      required: q.required,
      position: i,
      ...criterio,
    });
  }

  await deps.syncQuestions(jobId, ctx.organizationId, normalized);
  return ok(undefined);
}
