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

export type InterviewReportContent = {
  ubicacion: string;
  remuneracionPretendida: string;
  disponibilidad: string;
  resumen: string;
  fortalezas: string[];
  aspectosAValidar: string[];
};

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

export const editarInformeSchema = z.object({
  interviewId: z.string().uuid("ID de entrevista inválido."),
  ubicacion: z.string().trim().max(REPORT_LIST_ITEM_MAX_LENGTH),
  remuneracionPretendida: z.string().trim().max(REPORT_LIST_ITEM_MAX_LENGTH),
  disponibilidad: z.string().trim().max(REPORT_LIST_ITEM_MAX_LENGTH),
  resumen: z
    .string()
    .trim()
    .min(1, "El resumen no puede quedar vacío.")
    .max(REPORT_TEXT_MAX_LENGTH, `El resumen no puede superar los ${REPORT_TEXT_MAX_LENGTH} caracteres.`),
  fortalezas: listField,
  aspectosAValidar: listField,
  recommendation: z.enum(RECOMMENDATIONS, { errorMap: () => ({ message: "Recomendación inválida." }) }),
  recommendationJustification: z
    .string()
    .trim()
    .min(1, "La justificación no puede quedar vacía.")
    .max(REPORT_TEXT_MAX_LENGTH, `La justificación no puede superar los ${REPORT_TEXT_MAX_LENGTH} caracteres.`),
});
