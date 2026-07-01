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
    /** Nombre/headline de la búsqueda. */
    title: string;
    /** Puesto real (rol canónico); cuando existe, la IA prioriza esto sobre `title`. */
    position?: string | null;
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

export type DraftJobPostingInput = {
  title: string;
  skills: string[];
  seniority: string | null;
  location: string | null;
  modality: string | null;
};

/**
 * Generación estructurada de una búsqueda. A partir de unos pocos inputs mínimos, el modelo
 * devuelve los campos de la oferta listos para revisar/editar antes de guardar (NO prosa suelta).
 * Los valores de catálogo (jobArea) y la moneda se validan después en la capa de la action.
 */
export type DraftJobOfferInput = {
  /** Nombre atractivo de la publicación (headline). */
  name: string;
  /** Texto libre del recruiter con lo mínimo que sabe del puesto. */
  brief: string;
  modality: string | null;
  seniority: string | null;
  /** Jornada/contratación (employment type). */
  workDay: string | null;
};

export type DraftJobOffer = {
  /** Puesto real a cubrir (rol canónico). */
  position: string;
  /** Slug del área/sector (catálogo job_area); puede no mapear y se descarta luego. */
  jobArea: string | null;
  objectives: string;
  requirements: string;
  responsibilities: string;
  benefits: { name: string; description: string }[];
  vacancies: number;
  skills: string[];
};

export type InterviewGuideInput = {
  candidateName: string;
  jobTitle: string;
  skills: string[];
};

export type ReportInsightsInput = {
  jobTitle: string;
  total: number;
  hired: number;
  timeToHireDays: number | null;
  topSource: string | null;
};

export interface AiProvider {
  scoreApplication(input: ScoreApplicationInput): Promise<ScoreApplicationResult>;
  draftOffer(input: DraftOfferInput): Promise<string>;
  draftJobPosting(input: DraftJobPostingInput): Promise<string>;
  draftJobOffer(input: DraftJobOfferInput): Promise<DraftJobOffer>;
  interviewGuide(input: InterviewGuideInput): Promise<string[]>;
  reportInsights(input: ReportInsightsInput): Promise<string>;
}
