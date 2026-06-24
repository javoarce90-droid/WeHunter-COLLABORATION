import { z } from "zod";

/** Schemas de input de la feature de búsquedas. Validación cerca de la action. */

const emptyToUndef = (v: unknown) =>
  typeof v === "string" && v.trim() !== "" ? v : undefined;

// Entero opcional desde un input de texto/number ("" → undefined).
const optInt = z.preprocess(
  (v) => {
    if (v == null || (typeof v === "string" && v.trim() === "")) return undefined;
    const n = Number(v);
    return Number.isNaN(n) ? v : n;
  },
  z.number().int().min(0, "El salario no puede ser negativo.").max(1_000_000_000).optional(),
);

// "react, node, sql" → ["react","node","sql"]; vacío → undefined.
const skillsField = z.preprocess((v) => {
  if (typeof v !== "string") return undefined;
  const parts = v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}, z.array(z.string().max(40)).max(30).optional());

export const jobModalitySchema = z.enum(["onsite", "remote", "hybrid"]);
export const jobSenioritySchema = z.enum(["junior", "semisenior", "senior", "lead"]);
export const jobPrioritySchema = z.enum(["low", "medium", "high"]);
export const employmentTypeSchema = z.enum([
  "full_time",
  "part_time",
  "contract",
  "internship",
  "temporary",
]);

export const jobInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "El título es demasiado corto.")
    .max(120, "El título es demasiado largo."),
  description: z.preprocess(
    emptyToUndef,
    z.string().trim().max(5000, "La descripción es demasiado larga.").optional(),
  ),
  // Texto del aviso público.
  posting: z.preprocess(
    emptyToUndef,
    z.string().trim().max(10000, "El aviso es demasiado largo.").optional(),
  ),
  clientId: z.preprocess(emptyToUndef, z.string().uuid().optional()),
  location: z.preprocess(emptyToUndef, z.string().trim().max(160).optional()),
  modality: z.preprocess(emptyToUndef, jobModalitySchema.optional()),
  seniority: z.preprocess(emptyToUndef, jobSenioritySchema.optional()),
  employmentType: z.preprocess(emptyToUndef, employmentTypeSchema.optional()),
  salaryMin: optInt,
  salaryMax: optInt,
  salaryCurrency: z.preprocess(emptyToUndef, z.string().trim().max(8).optional()),
  skills: skillsField,
  priority: z.preprocess(emptyToUndef, jobPrioritySchema.optional()),
  // <input type="date"> → "YYYY-MM-DD". La columna es date (string).
  deadline: z.preprocess(emptyToUndef, z.string().max(10).optional()),
});

export const jobStatusSchema = z.enum(["draft", "open", "paused", "closed"]);

export type JobInput = z.infer<typeof jobInputSchema>;
