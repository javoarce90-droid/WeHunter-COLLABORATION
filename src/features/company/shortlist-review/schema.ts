import { z } from "zod";
import { FEEDBACK_DECISIONS } from "./domain/registrar-feedback";

export const registrarFeedbackSchema = z.object({
  token: z.string().min(1, "Enlace inválido."),
  shortlistCandidateId: z.string().uuid("Candidato inválido."),
  decision: z.enum(FEEDBACK_DECISIONS, {
    errorMap: () => ({ message: "La decisión seleccionada no es válida." }),
  }),
  comment: z.string().max(2000, "El comentario no puede superar los 2.000 caracteres.").optional(),
});

export const solicitarEntrevistaSchema = z.object({
  token: z.string().min(1, "Enlace inválido."),
  shortlistCandidateId: z.string().uuid("Candidato inválido."),
  // 1 a 3 horarios tentativos (datetime-local); la validación fina (futuro, sin
  // duplicados) vive en el dominio (`parseInterviewSlots`), acá solo el shape.
  slots: z
    .array(z.string().min(1))
    .min(1, "Proponé al menos un horario para la entrevista.")
    .max(3, "Podés proponer como máximo 3 horarios."),
});
