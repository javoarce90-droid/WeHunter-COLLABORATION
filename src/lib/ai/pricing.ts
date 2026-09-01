import type { GenerateContentResponseUsageMetadata } from "@google/genai";

/**
 * Estimación de costo por llamada a Gemini, para la telemetría (`ai_call`). NO es la fuente
 * de verdad de facturación: para eso está Google Cloud → Billing → Reports agrupado por SKU.
 * Sirve para responder "¿qué operación me está costando y por qué?" sin entrar a GCP.
 *
 * Precios de LISTA (USD por 1M de tokens), tier de prompt ≤200k — el único en el que caen los
 * prompts de WeHunter. Vigentes a 2026-09; si Google los cambia, se corrigen acá. Los
 * "thinking tokens" se facturan al precio de output.
 */
interface ModelPrice {
  /** Input no cacheado. */
  inputPerM: number;
  /** Output visible + thinking. */
  outputPerM: number;
  /** Porción del prompt servida desde context cache. */
  cachedInputPerM: number;
}

type PriceFamily = "flash-lite" | "flash" | "pro";

const PRICING: Record<PriceFamily, ModelPrice> = {
  "flash-lite": { inputPerM: 0.1, outputPerM: 0.4, cachedInputPerM: 0.025 },
  flash: { inputPerM: 0.3, outputPerM: 2.5, cachedInputPerM: 0.075 },
  pro: { inputPerM: 1.25, outputPerM: 10.0, cachedInputPerM: 0.3125 },
};

/**
 * Familia de precio a partir del nombre o alias del modelo (`gemini-flash-latest`,
 * `gemini-2.5-pro`, etc.). `null` = modelo fuera de la tabla → no se estima costo.
 */
export function priceFamily(model: string): PriceFamily | null {
  const m = model.toLowerCase();
  if (m.includes("flash-lite")) return "flash-lite";
  if (m.includes("flash")) return "flash";
  if (m.includes("pro")) return "pro";
  return null;
}

export interface AiCallCost {
  /** Tokens de entrada totales (incluye los cacheados). */
  promptTokens: number;
  cachedTokens: number;
  /** Visible + thinking (lo que se factura como output). */
  outputTokens: number;
  thoughtTokens: number;
  totalTokens: number;
  /** `null` si el modelo no está en la tabla de precios. */
  usd: number | null;
}

/**
 * Descompone el `usageMetadata` de una respuesta de Gemini en tokens por tipo y estima el
 * costo en USD. Tolera `usage` ausente (llamada fallida antes de responder) → todo en 0.
 */
export function estimateAiCallCost(
  model: string,
  usage: GenerateContentResponseUsageMetadata | undefined,
): AiCallCost {
  const promptTokens = usage?.promptTokenCount ?? 0;
  const cachedTokens = usage?.cachedContentTokenCount ?? 0;
  const thoughtTokens = usage?.thoughtsTokenCount ?? 0;
  const toolTokens = usage?.toolUsePromptTokenCount ?? 0;
  const outputTokens = (usage?.candidatesTokenCount ?? 0) + thoughtTokens;
  const totalTokens =
    usage?.totalTokenCount ?? promptTokens + outputTokens + toolTokens;

  const family = priceFamily(model);
  let usd: number | null = null;
  if (family) {
    const p = PRICING[family];
    // Los tokens de tool-use (ej. grounding de urlContext) se cobran como input.
    const billedInput = Math.max(0, promptTokens - cachedTokens) + toolTokens;
    usd =
      (billedInput * p.inputPerM +
        cachedTokens * p.cachedInputPerM +
        outputTokens * p.outputPerM) /
      1_000_000;
  }

  return {
    promptTokens,
    cachedTokens,
    outputTokens,
    thoughtTokens,
    totalTokens,
    usd,
  };
}
