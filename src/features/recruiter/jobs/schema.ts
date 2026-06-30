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

// Entero ≥ 1 desde input de texto/number ("" → undefined). Para cantidad de vacantes.
const optCount = z.preprocess(
  (v) => {
    if (v == null || (typeof v === "string" && v.trim() === "")) return undefined;
    const n = Number(v);
    return Number.isNaN(n) ? v : n;
  },
  z.number().int().min(1, "Debe haber al menos una vacante.").max(10_000).optional(),
);

// El form manda los beneficios como JSON ([{name, description}]) en un hidden input.
const benefitsField = z.preprocess((v) => {
  if (typeof v !== "string" || v.trim() === "") return undefined;
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}, z
  .array(
    z.object({
      name: z.string().trim().max(80).default(""),
      description: z.string().trim().max(280).default(""),
    }),
  )
  .max(20)
  .optional());

const markdownField = (max: number) =>
  z.preprocess(emptyToUndef, z.string().trim().max(max).optional());

export const jobModalitySchema = z.enum(["onsite", "remote", "hybrid"]);
export const jobSenioritySchema = z.enum(["junior", "semisenior", "senior", "lead"]);
export const jobPrioritySchema = z.enum(["low", "medium", "high"]);
export const employmentTypeSchema = z.enum([
  "full_time",
  "part_time",
  "contract",
  "internship",
  "temporary",
  "freelance",
]);
export const jobAreaSchema = z.enum([
  "tecnologia",
  "salud",
  "finanzas",
  "ventas",
  "marketing",
  "rrhh",
  "operaciones",
  "legal",
  "educacion",
  "ingenieria",
  "diseno",
  "atencion_cliente",
  "otro",
]);

export const jobInputSchema = z.object({
  // `title` = nombre atractivo (headline), tope corto. El puesto real va en `position`.
  title: z
    .string()
    .trim()
    .min(3, "El título es demasiado corto.")
    .max(33, "El título no puede superar los 33 caracteres."),
  position: z.preprocess(emptyToUndef, z.string().trim().max(120).optional()),
  jobArea: z.preprocess(emptyToUndef, jobAreaSchema.optional()),
  description: z.preprocess(
    emptyToUndef,
    z.string().trim().max(5000, "La descripción es demasiado larga.").optional(),
  ),
  // Texto del aviso público (legacy; el aviso se arma desde los campos estructurados).
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
  // Moneda ISO 4217 (3 letras). Se normaliza a mayúsculas.
  salaryCurrency: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? v.trim().toUpperCase() : undefined),
    z
      .string()
      .regex(/^[A-Z]{3}$/, "Usá un código de moneda ISO de 3 letras (ej. USD).")
      .optional(),
  ),
  skills: skillsField,
  priority: z.preprocess(emptyToUndef, jobPrioritySchema.optional()),
  // <input type="date"> → "YYYY-MM-DD". La columna es date (string).
  deadline: z.preprocess(emptyToUndef, z.string().max(10).optional()),
  vacancies: optCount,
  objectives: markdownField(5000),
  requirements: markdownField(5000),
  responsibilities: markdownField(5000),
  benefits: benefitsField,
});

export const jobStatusSchema = z.enum(["draft", "open", "paused", "closed"]);

export type JobInput = z.infer<typeof jobInputSchema>;
