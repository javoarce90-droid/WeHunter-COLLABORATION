import { z } from "zod";
import { toOptionalUrl } from "@/lib/url";

/** Schemas de input de la feature de candidatos. Validación cerca de la action. */

const emptyToUndef = (v: unknown) =>
  typeof v === "string" && v.trim() !== "" ? v : undefined;

// "react, node" → ["react","node"]; vacío → undefined.
const skillsField = z.preprocess((v) => {
  if (typeof v !== "string") return undefined;
  const parts = v.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : undefined;
}, z.array(z.string().max(40)).max(30).optional());

export const candidateSourceSchema = z.enum([
  "manual",
  "linkedin",
  "referral",
  "job_board",
  "other",
]);

export const candidateSenioritySchema = z.enum(["junior", "semisenior", "senior", "lead"]);

// `null`/`undefined` → "" para que el error sea "es obligatorio" y no un type error de zod.
const nullishToEmpty = (v: unknown) => (typeof v === "string" ? v : "");

export const candidateInputSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "El nombre es demasiado corto.")
    .max(120, "El nombre es demasiado largo."),
  // Email y teléfono son obligatorios en toda alta/edición manual (el email además ancla el
  // chequeo de duplicados y el vínculo con una cuenta real — ver duplicate-keys.ts /
  // profile-link.ts). La importación masiva por CSV es otro flujo y mantiene su propio schema.
  email: z.preprocess(
    nullishToEmpty,
    z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "El email es obligatorio.")
      .email("El email no es válido.")
      .max(160, "El email es demasiado largo."),
  ),
  phone: z.preprocess(
    nullishToEmpty,
    z
      .string()
      .trim()
      .min(1, "El teléfono es obligatorio.")
      .max(40, "El teléfono es demasiado largo."),
  ),
  headline: z.preprocess(emptyToUndef, z.string().trim().max(160).optional()),
  location: z.preprocess(emptyToUndef, z.string().trim().max(160).optional()),
  linkedinUrl: z.preprocess(toOptionalUrl, z.string().trim().max(300).optional()),
  summary: z.preprocess(emptyToUndef, z.string().trim().max(5000).optional()),
  skills: skillsField,
  seniority: z.preprocess(emptyToUndef, candidateSenioritySchema.optional()),
  source: z.preprocess(emptyToUndef, candidateSourceSchema.optional()),
});

export type CandidateInput = z.infer<typeof candidateInputSchema>;

// El alta usa el mismo schema que la edición: email + teléfono obligatorios en ambos casos.
// Se mantiene como export separado para no tocar los imports de las actions.
export const candidateCreateInputSchema = candidateInputSchema;

export type CandidateCreateInput = z.infer<typeof candidateCreateInputSchema>;

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

// Flujo "Crear con IA": PDF (Gemini lo lee nativo) y .docx (se extrae el texto con mammoth).
// El .doc binario viejo NO entra acá — se pide convertir. Ver src/lib/cv-extract.ts.
export const AI_CV_ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// Tope de CVs por tanda en el alta con IA por lote: cada uno es 1 llamada a Gemini y el
// procesamiento es bloqueante (sin infra de jobs). 10 mantiene el request bajo el timeout.
export const AI_BATCH_MAX_CVS = 10;

// Importación masiva: mapeo de columnas del archivo subido a campos del candidato. fullName/
// email vienen del select del form (siempre un string, "" si no se eligió columna).
const optionalColumn = z.preprocess(emptyToUndef, z.string().max(200).optional());

export const columnMappingSchema = z.object({
  fullName: z.string().trim().min(1, "Elegí qué columna es el nombre."),
  email: z.string().trim().min(1, "Elegí qué columna es el email."),
  phone: optionalColumn,
  location: optionalColumn,
  linkedinUrl: optionalColumn,
  headline: optionalColumn,
  skills: optionalColumn,
});

// Restricciones del archivo de importación (CSV/XLSX).
export const IMPORT_FILE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const IMPORT_FILE_ALLOWED_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
