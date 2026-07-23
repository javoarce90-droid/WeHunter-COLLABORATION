import { z } from "zod";
import { CV_MAX_BYTES, CV_ALLOWED_TYPES } from "@/features/recruiter/candidates/schema";

/** Schemas de input de la postulación pública. Validación cerca de la action. */

// El form manda las respuestas de screening como JSON en un hidden input (mismo patrón que
// las preguntas del lado recruiter, ver jobs/schema.ts).
export const screeningAnswersField = z.preprocess((v) => {
  if (typeof v !== "string" || v.trim() === "") return undefined;
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}, z
  .array(
    z.object({
      questionId: z.string().uuid(),
      value: z.string().trim().max(500),
    }),
  )
  .optional());

export const postularInputSchema = z.object({
  jobId: z.string().uuid("Búsqueda inválida."),
  fullName: z.string().trim().min(1, "Ingresá tu nombre.").max(160),
  email: z.string().trim().email("Email inválido."),
  phone: z.string().trim().max(40).optional(),
  coverNote: z.string().trim().max(2000, "El mensaje no puede superar los 2.000 caracteres.").optional(),
  screeningAnswers: screeningAnswersField,
});

// El CV reusa las mismas restricciones que la carga de candidatos del lado recruiter.
export { CV_MAX_BYTES, CV_ALLOWED_TYPES };
