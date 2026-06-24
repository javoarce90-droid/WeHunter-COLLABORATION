/**
 * Interfaz del proveedor de IA. La app SIEMPRE habla con esta interfaz, nunca con un modelo
 * directo. Hoy detrás hay un MockAiProvider determinístico (sin modelo real); cuando exista
 * OPENAI_API_KEY se puede enchufar una impl real sin tocar la UI ni el dominio.
 *
 * Los resultados se PERSISTEN (ai_score, ai_summary) para que la UI sea real y la IA quede
 * "lista para enchufar un modelo después".
 */

export type ScoreApplicationInput = {
  candidate: {
    id: string;
    skills: string[] | null;
    summary: string | null;
    source: string | null;
    hasCv: boolean;
  };
  job: {
    title: string;
    skills: string[] | null;
  };
};

export type ScoreApplicationResult = {
  /** 0–100. Compatibilidad estimada del candidato con la búsqueda. */
  score: number;
  /** Resumen corto del match (1–2 frases). */
  summary: string;
  /** Señales de atención (ej. "sin CV", "sin skills coincidentes"). */
  redFlags: string[];
};

export type DraftOfferInput = {
  candidateName: string;
  jobTitle: string;
  salary: string | null;
};

export interface AiProvider {
  scoreApplication(input: ScoreApplicationInput): Promise<ScoreApplicationResult>;
  draftOffer(input: DraftOfferInput): Promise<string>;
}
