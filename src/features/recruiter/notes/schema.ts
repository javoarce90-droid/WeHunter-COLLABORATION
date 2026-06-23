import { z } from "zod";

export const NOTE_MAX_LENGTH = 5000;

export const guardarNotaSchema = z.object({
  applicationId: z.string().uuid("ID de postulación inválido."),
  notes: z
    .string()
    .max(NOTE_MAX_LENGTH, `La nota no puede superar los ${NOTE_MAX_LENGTH} caracteres.`),
});
