import { z } from "zod";

export const CV_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const CV_ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const candidateCredentialsSchema = z.object({
  email: z.string().email("Ingresá un email válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export const candidateRegisterSchema = candidateCredentialsSchema.extend({
  fullName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
});

export const candidateProfileSchema = z.object({
  fullName: z.string().min(2, "El nombre completo debe tener al menos 2 caracteres"),
});
