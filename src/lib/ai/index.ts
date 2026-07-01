import type { AiProvider } from "./provider";
import { MockAiProvider } from "./mock";
import { GeminiAiProvider } from "./gemini";

export type {
  AiProvider,
  ScoreApplicationInput,
  ScoreApplicationResult,
  DraftOfferInput,
  DraftJobPostingInput,
  InterviewGuideInput,
  ReportInsightsInput,
} from "./provider";

/**
 * Punto único para obtener el proveedor de IA. Se elige acá según el entorno, sin tocar a quien
 * lo consume: el dominio y la UI siguen hablando con la interfaz AiProvider.
 * - Con GEMINI_API_KEY → Gemini real (cae al mock por-operación si la API falla).
 * - Sin clave → mock determinístico (dev/test, o si todavía no se configuró la IA).
 */
let instance: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (!instance) {
    const apiKey = process.env.GEMINI_API_KEY;
    instance = apiKey
      ? new GeminiAiProvider(apiKey, process.env.GEMINI_MODEL)
      : new MockAiProvider();
  }
  return instance;
}
