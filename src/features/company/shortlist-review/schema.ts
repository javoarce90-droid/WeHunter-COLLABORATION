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
