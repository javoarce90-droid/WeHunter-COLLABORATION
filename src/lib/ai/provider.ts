import type { EmploymentType, JobModality } from "@/features/recruiter/jobs/domain/job-details";

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

/** Desglose del match por categoría, 0–100 cada una. Mismo criterio que `score` (juicio de
 *  la IA a partir de los mismos datos de entrada, no un dato duro medido aparte). */
export type ScoreBreakdown = {
  experiencia: number;
  skillsTecnicos: number;
  seniority: number;
  idiomas: number;
  ubicacion: number;
};

export type ScoreApplicationResult = {
  /** 0–100. Compatibilidad estimada del candidato con la búsqueda. */
  score: number;
  /** Resumen corto del match (1–2 frases). */
  summary: string;
  /** Señales de atención (ej. "sin CV", "sin skills coincidentes"). */
  redFlags: string[];
  breakdown: ScoreBreakdown;
  /** Puntos fuertes del candidato para este puesto (2–4 items). */
  strengths: string[];
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

/**
 * Onboarding de candidato: a partir de un CV en PDF y/o una URL de LinkedIn, el modelo arma un
 * borrador de perfil (datos + experiencia + educación + certificaciones) listo para
 * revisar/editar antes de guardar — mismo criterio que draftJobOffer (nunca se guarda directo).
 */
export type DraftCandidateProfileInput = {
  /** CV del candidato. Solo PDF: Gemini lo entiende nativamente, sin parseo previo. */
  cvFile?: { base64: string; mimeType: "application/pdf" };
  /** URL de un perfil de LinkedIn. Best-effort: LinkedIn bloquea el fetch seguido. */
  linkedinUrl?: string;
};

export type DraftWorkExperience = {
  company: string;
  position: string;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  employmentType: EmploymentType | null;
  modality: JobModality | null;
  /** Solo si el CV/LinkedIn lista skills explícitas para este puesto puntual; si no, []. */
  skills: string[];
};

export type DraftEducation = {
  institution: string;
  degree: string;
  fieldOfStudy: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  grade: string | null;
  activities: string | null;
};

export type DraftCertification = {
  name: string;
  url: string | null;
};

export type DraftCandidateProfile = {
  /** Nombre completo si aparece en el CV/LinkedIn, si no null (se usa el de la cuenta). */
  fullName: string | null;
  /** Teléfono si aparece en el CV/LinkedIn, si no null. */
  phone: string | null;
  /** Puesto/título actual, ej "Frontend Senior". */
  headline: string;
  location: string | null;
  linkedinUrl: string | null;
  summary: string;
  /** Solo skills de una sección explícita ("Skills"/"Habilidades"/etc.); si no hay, []. */
  skills: string[];
  workExperiences: DraftWorkExperience[];
  education: DraftEducation[];
  certifications: DraftCertification[];
  /** Resultado de intentar leer la URL de LinkedIn. Ausente si no se pidió linkedinUrl. */
  linkedinFetchStatus?: "ok" | "low_signal" | "failed";
  /** true si Gemini falló y se cayó al mock — el borrador es un placeholder, no una extracción
   * real. Ausente/false cuando no hubo error (incluye el caso "no hay API key", que usa el mock
   * directamente sin haber intentado Gemini). */
  extractionFailed?: boolean;
};

export interface AiProvider {
  scoreApplication(input: ScoreApplicationInput): Promise<ScoreApplicationResult>;
  draftOffer(input: DraftOfferInput): Promise<string>;
  draftJobPosting(input: DraftJobPostingInput): Promise<string>;
  draftJobOffer(input: DraftJobOfferInput): Promise<DraftJobOffer>;
  draftCandidateProfile(input: DraftCandidateProfileInput): Promise<DraftCandidateProfile>;
  interviewGuide(input: InterviewGuideInput): Promise<string[]>;
  reportInsights(input: ReportInsightsInput): Promise<string>;
}
