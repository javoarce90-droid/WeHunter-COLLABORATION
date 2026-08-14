import { z } from "zod";
import { toOptionalUrl } from "@/lib/url";

/** Schemas de input de Configuración. Validación cerca de la action. */

const emptyToUndef = (v: unknown) =>
  typeof v === "string" && v.trim() !== "" ? v : undefined;

export const profileInputSchema = z.object({
  fullName: z.string().trim().min(1, "El nombre es obligatorio.").max(120),
  jobTitle: z.preprocess(emptyToUndef, z.string().trim().max(120).optional()),
  phone: z.preprocess(emptyToUndef, z.string().trim().max(40).optional()),
  location: z.preprocess(emptyToUndef, z.string().trim().max(160).optional()),
  linkedinUrl: z.preprocess(toOptionalUrl, z.string().trim().max(300).optional()),
  bio: z.preprocess(
    emptyToUndef,
    z.string().trim().max(500, "La bio no puede superar los 500 caracteres.").optional(),
  ),
  // "Tecnología, Producto" → ["Tecnología","Producto"]; vacío → undefined. Mismo formato que
  // SkillsPillsInput (input hidden separado por comas).
  specialties: z.preprocess((v) => {
    if (typeof v !== "string") return undefined;
    const parts = v.split(",").map((s) => s.trim()).filter(Boolean);
    return parts.length ? parts : undefined;
  }, z.array(z.string().max(40)).max(10).optional()),
  yearsOfExperience: z.preprocess((v) => {
    if (typeof v !== "string" || v.trim() === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }, z.number().int().min(0, "No puede ser negativo.").max(60, "Revisá el valor.").optional()),
});

export const workspaceIdentityInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre del workspace es obligatorio.").max(120),
});

// Restricciones de imagen (avatar / logo), validadas en la action antes de subir a Storage.
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
export const IMAGE_ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
