import { z } from "zod";

/** Schemas de input de Configuración. Validación cerca de la action. */

const emptyToUndef = (v: unknown) =>
  typeof v === "string" && v.trim() !== "" ? v : undefined;

export const profileInputSchema = z.object({
  fullName: z.string().trim().min(1, "El nombre es obligatorio.").max(120),
  jobTitle: z.preprocess(emptyToUndef, z.string().trim().max(120).optional()),
  phone: z.preprocess(emptyToUndef, z.string().trim().max(40).optional()),
  location: z.preprocess(emptyToUndef, z.string().trim().max(160).optional()),
  linkedinUrl: z.preprocess(emptyToUndef, z.string().trim().max(300).optional()),
  bio: z.preprocess(
    emptyToUndef,
    z.string().trim().max(500, "La bio no puede superar los 500 caracteres.").optional(),
  ),
});

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const colorField = () =>
  z.preprocess(emptyToUndef, z.string().trim().regex(HEX_COLOR_RE, "Color inválido (ej: #6D28D9).").optional());
const urlField = () =>
  z.preprocess(emptyToUndef, z.string().trim().url("URL inválida.").max(300).optional());

export const workspaceInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre del workspace es obligatorio.").max(120),
  careerSiteEnabled: z.preprocess((v) => v === "true" || v === "on", z.boolean()),
  description: z.preprocess(
    emptyToUndef,
    z.string().trim().max(1000, "La descripción no puede superar los 1000 caracteres.").optional(),
  ),
  primaryColor: colorField(),
  accentColor: colorField(),
  website: urlField(),
  linkedinUrl: urlField(),
  instagramUrl: urlField(),
  xUrl: urlField(),
  facebookUrl: urlField(),
});

export const passwordInputSchema = z
  .object({
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(72),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Las contraseñas no coinciden.",
    path: ["confirm"],
  });

// Restricciones de imagen (avatar / logo), validadas en la action antes de subir a Storage.
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const IMAGE_ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
