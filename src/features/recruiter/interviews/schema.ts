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

export const LOCATION_MAX_LENGTH = 500;
export const INTERVIEW_NOTES_MAX_LENGTH = 5000;

/** Campos comunes a agendar y actualizar. */
const interviewFields = {
  scheduledAt: z.coerce.date({
    errorMap: () => ({ message: "Fecha y hora inválidas." }),
  }),
  mode: z.enum(INTERVIEW_MODES, {
    errorMap: () => ({ message: "Modalidad inválida." }),
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
