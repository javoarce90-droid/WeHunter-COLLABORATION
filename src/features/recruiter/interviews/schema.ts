import { z } from "zod";

/** Modalidades de entrevista (espeja el enum `interview_mode` del schema Drizzle). */
export const INTERVIEW_MODES = ["onsite", "remote", "phone"] as const;
export type InterviewMode = (typeof INTERVIEW_MODES)[number];

export const MODE_LABELS: Record<InterviewMode, string> = {
  onsite: "Presencial",
  remote: "Videollamada",
  phone: "Telefónica",
};

/** Estados de entrevista (espeja el enum `interview_status` del schema Drizzle). */
export const INTERVIEW_STATUSES = ["scheduled", "completed", "cancelled"] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export const STATUS_LABELS: Record<InterviewStatus, string> = {
  scheduled: "Agendada",
  completed: "Realizada",
  cancelled: "Cancelada",
};

/** Tipo/propósito de la entrevista. Distinto de `mode` (modalidad presencial/remota/
 *  telefónica). Ya NO es un enum fijo: el select lista las etapas del pipeline de la
 *  búsqueda elegida (nombres libres, editables por el recruiter) y guardamos el nombre de
 *  la etapa tal cual estaba al agendar — texto libre, no una FK. `TYPE_LABELS`/`TYPE_BADGE`
 *  abajo son solo compat con datos viejos (pre-ago 2026, cuando sí era un enum fijo). */
export type InterviewType = string;

export const TYPE_MAX_LENGTH = 120;

export const TYPE_LABELS: Partial<Record<string, string>> = {
  screening: "Screening",
  technical: "Técnica",
  behavioral: "Comportamental",
  client: "Con cliente",
};

/** Variante de Badge por estado (vocabulario del design system, ver DESIGN.md). */
export const STATUS_BADGE: Record<InterviewStatus, "blue" | "success" | "muted"> = {
  scheduled: "blue",
  completed: "success",
  cancelled: "muted",
};

/** Variante de Badge por tipo — eco de los colores que ya usan las etapas del pipeline
 *  (screening/interview_tech/interview_client en `Badge`), para no inventar un código nuevo. */
export const TYPE_BADGE: Partial<Record<string, "blue" | "warning" | "muted" | "primary">> = {
  screening: "blue",
  technical: "warning",
  behavioral: "muted",
  client: "primary",
};

export const LOCATION_MAX_LENGTH = 500;
export const INTERVIEW_NOTES_MAX_LENGTH = 5000;
export const MAX_PARTICIPANTS = 20;

/** Campos comunes a agendar y actualizar. */
const interviewFields = {
  scheduledAt: z.coerce.date({
    errorMap: () => ({ message: "Fecha y hora inválidas." }),
  }),
  mode: z.enum(INTERVIEW_MODES, {
    errorMap: () => ({ message: "Modalidad inválida." }),
  }),
  type: z
    .string()
    .trim()
    .min(1, "Elegí un tipo de entrevista.")
    .max(TYPE_MAX_LENGTH, `El tipo no puede superar los ${TYPE_MAX_LENGTH} caracteres.`),
  location: z
    .string()
    .max(LOCATION_MAX_LENGTH, `El lugar/link no puede superar los ${LOCATION_MAX_LENGTH} caracteres.`)
    .optional(),
  notes: z
    .string()
    .max(
      INTERVIEW_NOTES_MAX_LENGTH,
      `Las notas no pueden superar los ${INTERVIEW_NOTES_MAX_LENGTH} caracteres.`,
    )
    .optional(),
  // Ya viene mergeado (equipo + externos, deduplicado) desde la action antes de validar.
  participantEmails: z
    .array(z.string().trim().email("Uno de los emails de participantes no es válido."))
    .max(MAX_PARTICIPANTS, `No podés agregar más de ${MAX_PARTICIPANTS} participantes.`)
    .optional(),
};

export const agendarInterviewSchema = z.object({
  applicationId: z.string().uuid("ID de postulación inválido."),
  ...interviewFields,
});

export const actualizarInterviewSchema = z.object({
  interviewId: z.string().uuid("ID de entrevista inválido."),
  status: z.enum(INTERVIEW_STATUSES, {
    errorMap: () => ({ message: "Estado inválido." }),
  }),
  ...interviewFields,
});

export const eliminarInterviewSchema = z.object({
  interviewId: z.string().uuid("ID de entrevista inválido."),
});
