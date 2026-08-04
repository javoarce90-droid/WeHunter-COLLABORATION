import { z } from "zod";
import {
  jobAreaSchema,
  jobModalitySchema,
  jobSenioritySchema,
  employmentTypeSchema,
} from "@/features/recruiter/jobs/schema";
import { REQUISITION_REASONS } from "./domain/solicitar-busqueda";

const emptyToUndef = (v: unknown) =>
  typeof v === "string" && v.trim() !== "" ? v : undefined;

// "react, node, sql" → ["react","node","sql"]; vacío → undefined. Mismo formato que el
// form de búsquedas del recruiter.
const skillsField = z.preprocess((v) => {
  if (typeof v !== "string") return undefined;
  const parts = v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}, z.array(z.string().max(40)).max(30).optional());

const markdownField = (max: number) =>
  z.preprocess(emptyToUndef, z.string().trim().max(max).optional());

export const sugerirSolicitudSchema = z.object({
  token: z.string().min(1, "Enlace inválido."),
  title: z
    .string()
    .trim()
    .min(3, "Cargá el título de la búsqueda primero.")
    .max(33, "El título no puede superar los 33 caracteres."),
  brief: z
    .string()
    .trim()
    .min(1, "Contanos en una línea qué perfil necesitás.")
    .max(500, "El detalle no puede superar los 500 caracteres."),
  modality: z.preprocess(emptyToUndef, jobModalitySchema.optional()),
  seniority: z.preprocess(emptyToUndef, jobSenioritySchema.optional()),
  employmentType: z.preprocess(emptyToUndef, employmentTypeSchema.optional()),
});

export const solicitarBusquedaSchema = z.object({
  token: z.string().min(1, "Enlace inválido."),
  reason: z.enum(REQUISITION_REASONS, {
    errorMap: () => ({ message: "El motivo de la solicitud no es válido." }),
  }),
  // Mismo tope que `jobs.title` (headline): al aprobar se copia tal cual al job, y un título
  // más largo generaría un job que después el form del recruiter no deja editar.
  title: z
    .string()
    .trim()
    .min(3, "El título de la búsqueda es demasiado corto.")
    .max(33, "El título no puede superar los 33 caracteres."),
  position: z.preprocess(emptyToUndef, z.string().trim().max(120).optional()),
  jobArea: z.preprocess(emptyToUndef, jobAreaSchema.optional()),
  location: z.preprocess(emptyToUndef, z.string().trim().max(160).optional()),
  // Obligatorios: sin esto el recruiter recibe una solicitud casi vacía y tiene que volver
  // a preguntarle al cliente lo básico antes de poder aprobarla.
  modality: z.preprocess(emptyToUndef, jobModalitySchema),
  seniority: z.preprocess(emptyToUndef, jobSenioritySchema),
  employmentType: z.preprocess(emptyToUndef, employmentTypeSchema),
  skills: skillsField,
  budget: z.preprocess(emptyToUndef, z.string().trim().max(160).optional()),
  estimatedStartDate: z.preprocess(emptyToUndef, z.string().max(10).optional()),
  objectives: markdownField(5000),
  requirements: markdownField(5000),
  responsibilities: markdownField(5000),
});
