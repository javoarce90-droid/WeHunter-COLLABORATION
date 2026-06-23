import { z } from "zod";

/** Schemas de input de la feature de candidatos. Validación cerca de la action. */

export const candidateInputSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "El nombre es demasiado corto.")
    .max(120, "El nombre es demasiado largo."),
  // Email opcional: vacío ("") o ausente (null/undefined) → undefined. Cualquier otra cosa
  // pasa al validador. Esto evita el "Expected string, received null" si el campo falta.
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v : undefined),
    z
      .string()
      .trim()
      .toLowerCase()
      .email("El email no es válido.")
      .max(160, "El email es demasiado largo.")
      .optional(),
  ),
});

export type CandidateInput = z.infer<typeof candidateInputSchema>;

// Restricciones del CV (validadas en la action antes de subir a Storage).
export const CV_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// Tipos de CV permitidos y su extensión canónica. La extensión del archivo guardado se deriva
// de acá (del MIME validado), NO del nombre que manda el cliente (evita path traversal / basura).
export const CV_EXT_BY_TYPE: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

export const CV_ALLOWED_TYPES = Object.keys(CV_EXT_BY_TYPE);
