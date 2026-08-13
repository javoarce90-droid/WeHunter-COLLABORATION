import { z } from "zod";

export const crearShortlistSchema = z.object({
  jobId: z.string().uuid("ID de búsqueda inválido."),
  name: z
    .string()
    .trim()
    .min(2, "El nombre del shortlist es demasiado corto.")
    .max(120, "El nombre es demasiado largo."),
  applicationIds: z
    .array(z.string().uuid())
    .min(1, "Seleccioná al menos un candidato para compartir."),
});

export const generarShareSchema = z.object({
  shortlistId: z.string().uuid("ID de shortlist inválido."),
  // "" o ausente → sin vencimiento. Número → días.
  expiresInDays: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : null),
    z.number().int().positive("El vencimiento debe ser de al menos un día.").nullable(),
  ),
});

export const revocarShareSchema = z.object({
  shareId: z.string().uuid("ID de enlace inválido."),
});

export const compartirConHMSchema = z.object({
  shortlistId: z.string().uuid("ID de shortlist inválido."),
  membershipId: z.string().uuid("Elegí un Hiring Manager."),
});

export const registrarFeedbackInternoSchema = z.object({
  shortlistCandidateId: z.string().uuid("ID de candidato inválido."),
  decision: z.string(),
  comment: z.string().default(""),
});

export const postearComentarioSchema = z.object({
  shortlistCandidateId: z.string().uuid("ID de candidato inválido."),
  body: z.string().trim().min(1, "El comentario no puede estar vacío.").max(2000, "El comentario no puede superar los 2.000 caracteres."),
});

export const solicitarEntrevistaInternoSchema = z.object({
  shortlistCandidateId: z.string().uuid("ID de candidato inválido."),
  slots: z
    .array(z.string().min(1))
    .min(1, "Proponé al menos un horario para la entrevista.")
    .max(3, "Podés proponer como máximo 3 horarios."),
});
