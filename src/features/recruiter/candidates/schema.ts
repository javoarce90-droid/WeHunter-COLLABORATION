import { z } from "zod";

/** Schemas de input de la feature de candidatos. Validación cerca de la action. */

export const candidateInputSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "El nombre es demasiado corto.")
    .max(120, "El nombre es demasiado largo."),
  // Email opcional: el campo vacío llega como "" desde el form → lo normalizamos a undefined.
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
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
export const CV_ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
