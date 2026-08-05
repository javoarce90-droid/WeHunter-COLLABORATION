import { z } from "zod";
import {
  jobAreaSchema,
  jobModalitySchema,
  jobSenioritySchema,
  employmentTypeSchema,
} from "@/features/recruiter/jobs/schema";

/** Schemas de input de la feature de solicitudes (§17). Validación cerca de la action. */

export const aprobarRequisitionSchema = z.object({
  requisitionId: z.string().uuid("ID de solicitud inválido."),
  reviewNote: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v : undefined),
    z.string().trim().max(2000, "El comentario no puede superar los 2.000 caracteres.").optional(),
  ),
});

export const rechazarRequisitionSchema = z.object({
  requisitionId: z.string().uuid("ID de solicitud inválido."),
  reviewNote: z
    .string()
    .trim()
    .min(3, "Contale al cliente por qué rechazás la solicitud.")
    .max(2000, "El comentario no puede superar los 2.000 caracteres."),
});

const emptyToUndef = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v : undefined);
const optionalText = (max: number) => z.preprocess(emptyToUndef, z.string().trim().max(max).optional());
const optionalEnum = <T extends [string, ...string[]]>(values: T) =>
  z.preprocess(emptyToUndef, z.enum(values).optional());

/** Camino HM (§17 Enterprise): mismos campos que el camino Cliente, más a quién se asigna.
 *  Los campos con catálogo fijo (área/modalidad/seniority/tipo) reusan los enums de
 *  `jobs/schema.ts` — mismo catálogo que ve un recruiter al crear la búsqueda a mano. */
export const cargarSolicitudSchema = z.object({
  assignedToMembershipId: z.string().uuid("Elegí a quién asignarle la solicitud."),
  reason: z.enum(["new_position", "backfill"], { message: "El motivo no es válido." }),
  title: z.string().trim().min(3, "El título de la búsqueda es demasiado corto.").max(120),
  position: optionalText(120),
  jobArea: optionalEnum(jobAreaSchema.options),
  location: optionalText(120),
  modality: optionalEnum(jobModalitySchema.options),
  seniority: optionalEnum(jobSenioritySchema.options),
  employmentType: optionalEnum(employmentTypeSchema.options),
  skills: optionalText(500),
  budget: optionalText(120),
  estimatedStartDate: optionalText(30),
  objectives: optionalText(5000),
  requirements: optionalText(5000),
  responsibilities: optionalText(5000),
});
