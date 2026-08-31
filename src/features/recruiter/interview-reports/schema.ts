import { z } from "zod";

export const SOURCE_TEXT_MIN_LENGTH = 20;
export const SOURCE_TEXT_MAX_LENGTH = 20000;
export const REPORT_TEXT_MAX_LENGTH = 4000;
export const REPORT_LIST_ITEM_MAX_LENGTH = 500;
export const MAX_REPORT_LIST_ITEMS = 12;

export const RECOMMENDATIONS = ["avanzar", "continuar_evaluando", "no_avanzar"] as const;
export type Recommendation = (typeof RECOMMENDATIONS)[number];

export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  avanzar: "Avanzar",
  continuar_evaluando: "Continuar evaluando",
  no_avanzar: "No avanzar",
};

/**
 * Contenido editable del informe (todo lo que va al jsonb `content` — `recommendation` y
 * `recommendationJustification` viven en columnas propias). Formato ampliado 2026-08-31 al
 * template real del cliente. Los informes viejos tienen menos campos: `parseInterviewReportContent`
 * los normaliza al leer.
 */
export type InterviewReportContent = {
  // Datos generales
  ubicacion: string;
  estudios: string;
  idiomas: string;
  ultimaRemuneracion: string;
  remuneracionPretendida: string;
  disponibilidadIngreso: string;
  disponibilidadEntrevistas: string;
  // Prosa
  resumenPerfil: string;
  situacionMotivacion: string;
  experienciaRelevante: string;
  stackConocimientos: string;
  // Evaluación
  fortalezas: string[];
  oportunidadesMejora: string[];
  aspectosAValidar: string[];
};

/** Campos de texto (todos van a "No informado" si faltan). En este orden se muestran/editan. */
export const REPORT_TEXT_FIELDS = [
  "ubicacion",
  "estudios",
  "idiomas",
  "ultimaRemuneracion",
  "remuneracionPretendida",
  "disponibilidadIngreso",
  "disponibilidadEntrevistas",
  "resumenPerfil",
  "situacionMotivacion",
  "experienciaRelevante",
  "stackConocimientos",
] as const;

export const REPORT_LIST_FIELDS = [
  "fortalezas",
  "oportunidadesMejora",
  "aspectosAValidar",
] as const;

export const REPORT_FIELD_LABELS: Record<
  keyof InterviewReportContent,
  string
> = {
  ubicacion: "Ubicación",
  estudios: "Estudios",
  idiomas: "Idiomas",
  ultimaRemuneracion: "Última remuneración",
  remuneracionPretendida: "Remuneración pretendida",
  disponibilidadIngreso: "Disponibilidad de ingreso",
  disponibilidadEntrevistas: "Disponibilidad para entrevistas",
  resumenPerfil: "Resumen del perfil",
  situacionMotivacion: "Situación actual y motivación",
  experienciaRelevante: "Experiencia profesional relevante",
  stackConocimientos: "Stack y conocimientos",
  fortalezas: "Fortalezas observadas",
  oportunidadesMejora: "Oportunidades de mejora",
  aspectosAValidar: "Aspectos a validar",
};

const NI = "No informado";

/** Normaliza el jsonb `content` (de cualquier versión) al shape actual. Los informes generados
 *  antes del 2026-08-31 tienen `disponibilidad`/`resumen` en vez de los campos separados. */
export function parseInterviewReportContent(raw: unknown): InterviewReportContent {
  const c = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const s = (v: unknown, fallback = NI) =>
    typeof v === "string" && v.trim() ? v : fallback;
  const list = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  return {
    ubicacion: s(c.ubicacion),
    estudios: s(c.estudios),
    idiomas: s(c.idiomas),
    ultimaRemuneracion: s(c.ultimaRemuneracion),
    remuneracionPretendida: s(c.remuneracionPretendida),
    disponibilidadIngreso: s(c.disponibilidadIngreso ?? c.disponibilidad),
    disponibilidadEntrevistas: s(c.disponibilidadEntrevistas),
    resumenPerfil: s(c.resumenPerfil ?? c.resumen),
    situacionMotivacion: s(c.situacionMotivacion),
    experienciaRelevante: s(c.experienciaRelevante),
    stackConocimientos: s(c.stackConocimientos),
    fortalezas: list(c.fortalezas),
    oportunidadesMejora: list(c.oportunidadesMejora),
    aspectosAValidar: list(c.aspectosAValidar),
  };
}

/** Datos de la entrevista "Fuente: WeHunter" (sección 1 del informe, spec del cliente) — se
 *  muestran de solo lectura, nunca se editan desde acá. */
export type InterviewReportContext = {
  candidateName: string;
  jobTitle: string;
  interviewerName: string;
  interviewDate: Date;
};

export type InterviewReportRow = InterviewReportContent & {
  interviewId: string;
  recommendation: Recommendation;
  recommendationJustification: string;
  generatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export const generarInformeSchema = z.object({
  interviewId: z.string().uuid("ID de entrevista inválido."),
  sourceText: z
    .string()
    .trim()
    .min(
      SOURCE_TEXT_MIN_LENGTH,
      `Pegá al menos ${SOURCE_TEXT_MIN_LENGTH} caracteres de notas o transcripción.`,
    )
    .max(SOURCE_TEXT_MAX_LENGTH, `Las notas no pueden superar los ${SOURCE_TEXT_MAX_LENGTH} caracteres.`),
});

const listField = z.array(z.string().trim().max(REPORT_LIST_ITEM_MAX_LENGTH)).max(MAX_REPORT_LIST_ITEMS);
/** Los campos cortos (datos generales) van hasta 500; los de prosa/Markdown hasta 4000. */
const shortText = z.string().trim().max(REPORT_LIST_ITEM_MAX_LENGTH);
const longText = z
  .string()
  .trim()
  .max(REPORT_TEXT_MAX_LENGTH, `El texto no puede superar los ${REPORT_TEXT_MAX_LENGTH} caracteres.`);

export const editarInformeSchema = z.object({
  interviewId: z.string().uuid("ID de entrevista inválido."),
  ubicacion: shortText,
  estudios: shortText,
  idiomas: shortText,
  ultimaRemuneracion: shortText,
  remuneracionPretendida: shortText,
  disponibilidadIngreso: shortText,
  disponibilidadEntrevistas: shortText,
  resumenPerfil: longText.min(1, "El resumen no puede quedar vacío."),
  situacionMotivacion: longText,
  experienciaRelevante: longText,
  stackConocimientos: longText,
  fortalezas: listField,
  oportunidadesMejora: listField,
  aspectosAValidar: listField,
  recommendation: z.enum(RECOMMENDATIONS, { errorMap: () => ({ message: "Recomendación inválida." }) }),
  recommendationJustification: longText.min(1, "La conclusión no puede quedar vacía."),
});
