import { z } from "zod";

export const CV_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const CV_ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const candidateProfileSchema = z.object({
  fullName: z.string().min(2, "El nombre completo debe tener al menos 2 caracteres"),
  headline: z.string().trim().optional(),
  location: z.string().trim().optional(),
  linkedinUrl: z.string().trim().optional(),
  summary: z.string().trim().optional(),
  // Viene del form como texto separado por comas (mismo criterio que JobForm).
  skills: z.string().trim().optional(),
});
