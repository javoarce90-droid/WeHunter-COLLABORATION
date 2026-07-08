import { z } from "zod";
import { CV_MAX_BYTES } from "@/features/candidate/profile/schema";

export { CV_MAX_BYTES };

/** Solo PDF para el flujo de IA: Gemini lo entiende nativamente, sin parsear nada antes. Si el
 * candidato tiene el CV en Word, se le pide convertirlo — el upload general de /c/profile sigue
 * aceptando doc/docx sin cambios. */
export const AI_CV_ALLOWED_TYPES = ["application/pdf"];

const employmentTypeSchema = z.enum([
  "full_time",
  "part_time",
  "contract",
  "internship",
  "temporary",
  "freelance",
]);
const modalitySchema = z.enum(["onsite", "remote", "hybrid"]);

export const aiWorkExperienceItemSchema = z.object({
  company: z.string().min(1),
  position: z.string().min(1),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  employmentType: employmentTypeSchema.nullable().optional(),
  modality: modalitySchema.nullable().optional(),
  skills: z.array(z.string()).optional(),
});

export const aiEducationItemSchema = z.object({
  institution: z.string().min(1),
  degree: z.string().min(1),
  fieldOfStudy: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  grade: z.string().nullable().optional(),
  activities: z.string().nullable().optional(),
});

export const aiCertificationItemSchema = z.object({
  name: z.string().min(1),
  url: z.string().nullable().optional(),
});

export const aiWorkExperiencesSchema = z.array(aiWorkExperienceItemSchema).max(50);
export const aiEducationEntriesSchema = z.array(aiEducationItemSchema).max(50);
export const aiCertificationsSchema = z.array(aiCertificationItemSchema).max(50);
