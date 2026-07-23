import { z } from "zod";

/** Schemas de input de la feature de solicitudes (§17). Validación cerca de la action. */

export const aprobarRequisitionSchema = z.object({
  requisitionId: z.string().uuid("ID de solicitud inválido."),
  reviewNote: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v : undefined),
    z.string().trim().max(2000, "El comentario no puede superar los 2.000 caracteres.").optional(),
  ),
});

export const rechazarRequisitionSchema = z.object({
  requisitionId: z.string().uuid("ID de solicitud inválido."),
  reviewNote: z
    .string()
    .trim()
    .min(3, "Contale al cliente por qué rechazás la solicitud.")
    .max(2000, "El comentario no puede superar los 2.000 caracteres."),
});
