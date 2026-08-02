import { z } from "zod";
import { toOptionalUrl } from "@/lib/url";

/** Schema de input del Career Site. Validación cerca de la action. */

const emptyToUndef = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v : undefined);

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const colorField = () =>
  z.preprocess(emptyToUndef, z.string().trim().regex(HEX_COLOR_RE, "Color inválido (ej: #6D28D9).").optional());
const urlField = () =>
  z.preprocess(toOptionalUrl, z.string().trim().url("URL inválida.").max(300).optional());

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const careerSiteInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "El slug debe tener al menos 3 caracteres.")
    .max(60)
    .regex(SLUG_RE, "Usá solo minúsculas, números y guiones (ej: mi-empresa)."),
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

// Restricciones de imagen (portada), validadas en la action antes de subir a Storage.
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const IMAGE_ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
