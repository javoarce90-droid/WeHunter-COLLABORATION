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
  // Elegido a mano en el alta cuando hay más de un candidato posible (owner/admin/recruiter).
  // Se revalida server-side contra la org real en el dominio, esto solo chequea la forma.
  assignedMembershipId: z.preprocess(
    emptyToUndef,
    z.string().uuid("Responsable inválido.").optional(),
  ),
});

export type ClientInput = z.infer<typeof clientInputSchema>;

export const generarClientShareSchema = z.object({
  clientId: z.string().uuid("ID de cliente inválido."),
  // "" o ausente → sin vencimiento. Número → días.
  expiresInDays: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? Number(v) : null),
    z.number().int().positive("El vencimiento debe ser de al menos un día.").nullable(),
  ),
});

export const revocarClientShareSchema = z.object({
  shareId: z.string().uuid("ID de enlace inválido."),
});
