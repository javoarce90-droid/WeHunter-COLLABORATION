import type { AiProvider } from "./provider";
import { MockAiProvider } from "./mock";
import {
  GeminiAiProvider,
  DEFAULT_PRIMARY_MODEL,
  DEFAULT_FALLBACK_MODEL,
  parseModelOverrides,
} from "./gemini";

export type {
  AiProvider,
  ScoreApplicationInput,
  ScoreApplicationResult,
  ScoreBreakdown,
  CandidateExperienceInput,
  CandidateEducationInput,
  DraftOfferInput,
  DraftJobPostingInput,
  DraftJobOfferInput,
  DraftJobOffer,
  DraftScreeningQuestionsInput,
  DraftScreeningQuestion,
  DraftCandidateProfileInput,
  DraftCandidateProfile,
  DraftWorkExperience,
  DraftEducation,
  DraftCertification,
  InterviewGuideInput,
  ReportInsightsInput,
  InterviewReportInput,
  InterviewReportResult,
  InterviewReportRecommendation,
} from "./provider";

/**
 * Punto único para obtener el proveedor de IA. Se elige acá según el entorno, sin tocar a quien
 * lo consume: el dominio y la UI siguen hablando con la interfaz AiProvider.
 * - Con GEMINI_API_KEY → Gemini real, con cascada de modelos (principal → degradación) y, si
 *   ambos fallan, degradación al heurístico local o AiUnavailableError según la operación.
 * - Sin clave → mock determinístico (dev/test, o si todavía no se configuró la IA).
 *
 * Modelos configurables por env (opcional):
 * - GEMINI_MODEL_PRIMARY   (default gemini-flash-latest) — rápido, es el que corre siempre.
 * - GEMINI_MODEL_FALLBACK  (default gemini-pro-latest) — se prueba SOLO si el principal falla.
 * - GEMINI_MODEL           (legacy) — si está, se usa como principal y anula PRIMARY.
 * - GEMINI_MODEL_OVERRIDES (JSON) — cascada distinta para operaciones puntuales, ej.
 *   {"interviewReport":"gemini-pro-latest,gemini-flash-latest"}. Sirve para promover a Pro
 *   solo lo que corre en background y donde la calidad importa más que la latencia.
 */
let instance: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (!instance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      instance = new MockAiProvider();
    } else {
      const primary =
        process.env.GEMINI_MODEL ||
        process.env.GEMINI_MODEL_PRIMARY ||
        DEFAULT_PRIMARY_MODEL;
      const fallback =
        process.env.GEMINI_MODEL_FALLBACK || DEFAULT_FALLBACK_MODEL;
      instance = new GeminiAiProvider(
        apiKey,
        [primary, fallback],
        parseModelOverrides(process.env.GEMINI_MODEL_OVERRIDES),
      );
    }
  }
  return instance;
}
