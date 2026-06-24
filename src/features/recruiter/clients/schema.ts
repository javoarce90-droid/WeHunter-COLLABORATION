import { z } from "zod";

/** Schemas de input de la feature de clientes (CRM mínimo). Validación cerca de la action. */

// "" o ausente → undefined; cualquier otra cosa pasa al validador (evita "received null").
const emptyToUndef = (v: unknown) =>
  typeof v === "string" && v.trim() !== "" ? v : undefined;

export const clientInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre es demasiado corto.")
    .max(120, "El nombre es demasiado largo."),
  contactName: z.preprocess(
    emptyToUndef,
    z.string().trim().max(120, "El contacto es demasiado largo.").optional(),
  ),
  contactEmail: z.preprocess(
    emptyToUndef,
    z
      .string()
      .trim()
      .toLowerCase()
      .email("El email de contacto no es válido.")
      .max(160)
      .optional(),
  ),
  notes: z.preprocess(
    emptyToUndef,
    z.string().trim().max(2000, "Las notas son demasiado largas.").optional(),
  ),
});

export type ClientInput = z.infer<typeof clientInputSchema>;
