import { z } from "zod";

/** Schemas de input de la feature de búsquedas. Validación cerca de la action. */

export const jobInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "El título es demasiado corto.")
    .max(120, "El título es demasiado largo."),
  description: z
    .string()
    .trim()
    .max(5000, "La descripción es demasiado larga.")
    .optional(),
});

export const jobStatusSchema = z.enum(["draft", "open", "paused", "closed"]);

export type JobInput = z.infer<typeof jobInputSchema>;
