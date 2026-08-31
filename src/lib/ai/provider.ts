import type {
  EmploymentType,
  JobModality,
} from "@/features/recruiter/jobs/domain/job-details";

/**
 * Interfaz del proveedor de IA. La app SIEMPRE habla con esta interfaz, nunca con un modelo
 * directo. Hoy detrás hay un MockAiProvider determinístico (sin modelo real); cuando exista
 * OPENAI_API_KEY se puede enchufar una impl real sin tocar la UI ni el dominio.
 *
 * Los resultados se PERSISTEN (ai_score, ai_summary) para que la UI sea real y la IA quede
 * "lista para enchufar un modelo después".
 */

export type CandidateExperienceInput = {
  position: string;
  company: string;
  description: string | null;
};

export type CandidateEducationInput = {
  degree: string;
  institution: string;
  fieldOfStudy: string | null;
};

export type ScoreApplicationInput = {
  candidate: {
    id: string;
    skills: string[] | null;
    summary: string | null;
    source: string | null;
    experience: CandidateExperienceInput[];
    education: CandidateEducationInput[];
  };
  job: {
    /** Nombre/headline de la búsqueda. */
    title: string;
    /** Puesto real (rol canónico); cuando existe, la IA prioriza esto sobre `title`. */
    position?: string | null;
    skills: string[] | null;
    objectives?: string | null;
    requirements?: string | null;
    responsibilities?: string | null;
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
  /** Señales de atención (ej. "perfil sin información cargada", "sin skills coincidentes").
   *  Nunca por falta de CV: no es una señal de compatibilidad. */
  redFlags: string[];
  breakdown: ScoreBreakdown;
  /** Puntos fuertes del candidato para este puesto (2–4 items). */
  strengths: string[];
  /** true si este score NO lo produjo el modelo real: o no hay IA configurada, o Gemini falló
   *  y se degradó al heurístico local. La UI lo muestra como "estimación sin IA" para que el
   *  recruiter no le dé el mismo peso que a un análisis real. */
  degraded?: boolean;
};

/**
 * Scoring en lote: puntúa N candidatos contra UNA búsqueda en una sola llamada al modelo (o
 * unos pocos chunks), en vez de N llamadas. Es la forma canónica de scorear en Matchear pool,
 * Postulados y Sourcing — misma semántica que `scoreApplication` por candidato, pero ~N× más
 * barato en tokens (el contexto de la búsqueda no se repite) y una latencia en vez de N.
 */
export type ScoreApplicationsBatchInput = {
  job: ScoreApplicationInput["job"];
  /** Cada candidato lleva `id` — el resultado se devuelve emparejado por ese id. */
  candidates: ScoreApplicationInput["candidate"][];
};

export type ScoredCandidate = ScoreApplicationResult & { candidateId: string };

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

/**
 * Sugerencias de preguntas de screening a partir del contenido ya cargado del aviso (mismos
 * campos que `AvisoEditor` ya edita) — el recruiter revisa y elige cuáles agregar, nunca se
 * guardan directo. `type` espeja `ScreeningQuestionType` del dominio (yes_no/text/number/
 * multiple_choice) pero como `string` acá para no acoplar `lib/ai` a una feature.
 */
export type DraftScreeningQuestionsInput = {
  title: string;
  objectives: string | null;
  requirements: string | null;
  responsibilities: string | null;
  skills: string[] | null;
};

export type DraftScreeningQuestion = {
  label: string;
  /** "yes_no" | "text" | "number" | "multiple_choice" */
  type: string;
  /** Solo para multiple_choice. */
  options?: string[];
  isCriterion: boolean;
  /** Respuestas válidas esperadas (yes_no/multiple_choice), cuando isCriterion. */
  expectedValues?: string[];
  /** Rango válido (number), cuando isCriterion. */
  minValue?: number | null;
  maxValue?: number | null;
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
  /** CV del candidato en PDF: Gemini lo entiende nativamente, sin parseo previo. */
  cvFile?: { base64: string; mimeType: "application/pdf" };
  /** Texto plano ya extraído de un CV (ej. `.docx` vía mammoth). Alternativa a `cvFile`. */
  cvText?: string;
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
  /** Email de contacto si aparece en el CV/LinkedIn, si no null. Lo usa el alta por lote del
   *  recruiter (sin revisión manual, necesita el email para dedup); en el onboarding del
   *  candidato se ignora (ya está logueado). */
  email: string | null;
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
  /** Por qué falló, cuando `extractionFailed` es true. `quota` = límite de la API de IA (429),
   * se reintenta más tarde sin cambiar el archivo. `unreadable` = el modelo no pudo con este CV
   * (PDF escaneado, protegido, etc.). */
  failureReason?: "quota" | "unreadable";
};

/**
 * Informe de entrevista con IA (docs/BACKLOG-QA-AJUSTES § "Informe de entrevista con IA",
 * ampliado 2026-08-31 al formato del template real del cliente): a partir de notas o una
 * transcripción que pega el recruiter, el modelo arma un informe estandarizado listo para
 * revisar/editar antes de guardar (mismo criterio que draftJobOffer: nunca se guarda directo).
 */
export type InterviewReportInput = {
  candidateName: string;
  jobTitle: string;
  interviewerName: string;
  /** Ya formateada para el prompt (no se re-parsea acá). */
  interviewDate: string;
  /** Notas o transcripción que pegó el recruiter. */
  sourceText: string;
};

export type InterviewReportRecommendation =
  | "avanzar"
  | "continuar_evaluando"
  | "no_avanzar";

/**
 * Todos los campos de texto son "No informado" cuando el dato no surge de las notas — nunca
 * vacío/null, el string es lo que se muestra en el informe. Los campos Markdown pueden quedar
 * "No informado" también. Los "Fuente: WeHunter" (candidato, puesto, fecha, entrevistador) NO
 * van acá: salen del contexto de la entrevista.
 */
export type InterviewReportResult = {
  // --- Datos generales (extraídos de las notas) ---
  ubicacion: string;
  estudios: string;
  idiomas: string;
  ultimaRemuneracion: string;
  remuneracionPretendida: string;
  disponibilidadIngreso: string;
  disponibilidadEntrevistas: string;
  // --- Prosa ---
  /** Trayectoria del candidato + impresión general de la conversación (4-6 líneas). */
  resumenPerfil: string;
  /** Si está en búsqueda activa, por qué, qué busca en su próximo paso. */
  situacionMotivacion: string;
  /** Markdown: empleos relevantes con lo que hizo, tecnologías y motivo de salida. */
  experienciaRelevante: string;
  /** Markdown: tecnologías que domina y las que está incorporando. */
  stackConocimientos: string;
  // --- Evaluación ---
  fortalezas: string[];
  /** Áreas de desarrollo, en tono constructivo — NO "debilidades". */
  oportunidadesMejora: string[];
  aspectosAValidar: string[];
  // --- Cierre ---
  recommendation: InterviewReportRecommendation;
  /** Conclusión: justifica la recomendación con evidencia de la conversación. */
  recommendationJustification: string;
};

export interface AiProvider {
  scoreApplication(
    input: ScoreApplicationInput,
  ): Promise<ScoreApplicationResult>;
  /** Puntúa varios candidatos contra una búsqueda de una. El orden del resultado NO está
   *  garantizado; emparejá por `candidateId`. Siempre devuelve un resultado por cada candidato
   *  pedido (rellena con el heurístico local los que el modelo no haya cubierto). */
  scoreApplicationsBatch(
    input: ScoreApplicationsBatchInput,
  ): Promise<ScoredCandidate[]>;
  draftOffer(input: DraftOfferInput): Promise<string>;
  draftJobPosting(input: DraftJobPostingInput): Promise<string>;
  draftJobOffer(input: DraftJobOfferInput): Promise<DraftJobOffer>;
  draftScreeningQuestions(
    input: DraftScreeningQuestionsInput,
  ): Promise<DraftScreeningQuestion[]>;
  draftCandidateProfile(
    input: DraftCandidateProfileInput,
  ): Promise<DraftCandidateProfile>;
  interviewGuide(input: InterviewGuideInput): Promise<string[]>;
  reportInsights(input: ReportInsightsInput): Promise<string>;
  interviewReport(input: InterviewReportInput): Promise<InterviewReportResult>;
}
