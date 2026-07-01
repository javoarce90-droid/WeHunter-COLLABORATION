import { z } from "zod";
import { CV_MAX_BYTES, CV_ALLOWED_TYPES } from "@/features/recruiter/candidates/schema";

/** Schemas de input de la postulación pública. Validación cerca de la action. */

export const postularInputSchema = z.object({
  jobId: z.string().uuid("Búsqueda inválida."),
  fullName: z.string().trim().min(1, "Ingresá tu nombre.").max(160),
  email: z.string().trim().email("Email inválido."),
  phone: z.string().trim().max(40).optional(),
  coverNote: z.string().trim().max(2000, "El mensaje no puede superar los 2.000 caracteres.").optional(),
});

// El CV reusa las mismas restricciones que la carga de candidatos del lado recruiter.
export { CV_MAX_BYTES, CV_ALLOWED_TYPES };
