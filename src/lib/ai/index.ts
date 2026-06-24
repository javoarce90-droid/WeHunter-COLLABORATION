import type { AiProvider } from "./provider";
import { MockAiProvider } from "./mock";

export type { AiProvider, ScoreApplicationInput, ScoreApplicationResult, DraftOfferInput } from "./provider";

/**
 * Punto único para obtener el proveedor de IA. Hoy devuelve el mock determinístico.
 * El día que haya un modelo real, se elige acá (p. ej. según OPENAI_API_KEY) sin tocar
 * a quien lo consume: el dominio y la UI siguen hablando con la interfaz AiProvider.
 */
let instance: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (!instance) {
    // Seam para el futuro: if (process.env.OPENAI_API_KEY) instance = new OpenAiProvider();
    instance = new MockAiProvider();
  }
  return instance;
}
