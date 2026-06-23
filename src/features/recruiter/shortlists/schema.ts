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
