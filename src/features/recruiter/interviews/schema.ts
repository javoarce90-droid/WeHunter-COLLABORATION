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

/** Tipo/propósito de la entrevista (espeja el enum `interview_type` del schema Drizzle).
 *  Distinto de `mode` (modalidad presencial/remota/telefónica). */
export const INTERVIEW_TYPES = ["screening", "technical", "behavioral", "client"] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const TYPE_LABELS: Record<InterviewType, string> = {
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
export const TYPE_BADGE: Record<InterviewType, "blue" | "warning" | "muted" | "primary"> = {
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
  type: z.enum(INTERVIEW_TYPES, {
    errorMap: () => ({ message: "Tipo de entrevista inválido." }),
  }),
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
