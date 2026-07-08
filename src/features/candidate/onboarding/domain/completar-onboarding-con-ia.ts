import { ok, err, type Result } from "@/lib/result";
import type { EmploymentType, JobModality } from "@/features/recruiter/jobs/domain/job-details";
import { normalizeExperiencia, type NormalizedExperiencia } from "@/features/candidate/profile/domain/gestionar-experiencia";
import { normalizeEducacion, type NormalizedEducacion } from "@/features/candidate/profile/domain/gestionar-educacion";
import { normalizeCertificacion, type NormalizedCertificacion } from "@/features/candidate/profile/domain/gestionar-certificacion";

/**
 * Caso de uso: finalizar el onboarding con el borrador revisado por el candidato (perfil +
 * experiencia + educación + certificaciones que generó la IA a partir del CV/LinkedIn). NO
 * reusa actualizarPerfil (que solo maneja campos planos): esta es la única vía que además
 * persiste las 3 tablas de currículum, así que valida y normaliza todo acá.
 */

export interface WorkExperienceDraftItem {
  company: string;
  position: string;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
  employmentType?: EmploymentType | null;
  modality?: JobModality | null;
  skills?: string[];
}

export interface EducationDraftItem {
  institution: string;
  degree: string;
  fieldOfStudy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  description?: string | null;
  grade?: string | null;
  activities?: string | null;
}

export interface CertificationDraftItem {
  name: string;
  url?: string | null;
}

export interface CompletarOnboardingConIaInput {
  fullName: string;
  headline?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  summary?: string;
  /** Texto separado por comas, mismo criterio que actualizarPerfil. */
  skills?: string;
  cvUrl?: string;
  workExperiences: WorkExperienceDraftItem[];
  education: EducationDraftItem[];
  certifications: CertificationDraftItem[];
}

export interface CompletarOnboardingConIaCtx {
  userId: string | null;
}

export interface PersistOnboardingDraftInput {
  profile: {
    fullName: string;
    headline: string | null;
    phone: string | null;
    location: string | null;
    linkedinUrl: string | null;
    bio: string | null;
    skills: string[] | null;
    cvUrl?: string;
  };
  workExperiences: NormalizedExperiencia[];
  education: NormalizedEducacion[];
  certifications: NormalizedCertificacion[];
}

export interface CompletarOnboardingConIaDeps {
  persistDraft: (userId: string, fields: PersistOnboardingDraftInput) => Promise<void>;
}

export async function completarOnboardingConIa(
  input: CompletarOnboardingConIaInput,
  ctx: CompletarOnboardingConIaCtx,
  deps: CompletarOnboardingConIaDeps,
): Promise<Result<{ userId: string }>> {
  if (!ctx.userId) {
    return err("Necesitás estar autenticado para completar tu perfil.");
  }

  const fullName = input.fullName.trim();
  if (fullName.length < 2) {
    return err("El nombre completo es demasiado corto.");
  }

  const workExperiences: NormalizedExperiencia[] = [];
  for (const item of input.workExperiences) {
    const normalized = normalizeExperiencia({
      company: item.company,
      position: item.position,
      startDate: item.startDate ?? undefined,
      endDate: item.endDate ?? undefined,
      description: item.description ?? undefined,
      employmentType: item.employmentType ?? undefined,
      modality: item.modality ?? undefined,
      skills: item.skills?.join(","),
    });
    if (!normalized.ok) return normalized;
    workExperiences.push(normalized.data);
  }

  const education: NormalizedEducacion[] = [];
  for (const item of input.education) {
    const normalized = normalizeEducacion({
      institution: item.institution,
      degree: item.degree,
      fieldOfStudy: item.fieldOfStudy ?? undefined,
      startDate: item.startDate ?? undefined,
      endDate: item.endDate ?? undefined,
      description: item.description ?? undefined,
      grade: item.grade ?? undefined,
      activities: item.activities ?? undefined,
    });
    if (!normalized.ok) return normalized;
    education.push(normalized.data);
  }

  const certifications: NormalizedCertificacion[] = [];
  for (const item of input.certifications) {
    const normalized = normalizeCertificacion({ name: item.name, url: item.url ?? undefined });
    if (!normalized.ok) return normalized;
    certifications.push(normalized.data);
  }

  const skills = input.skills
    ? Array.from(new Set(input.skills.split(",").map((s) => s.trim()).filter(Boolean)))
    : null;

  await deps.persistDraft(ctx.userId, {
    profile: {
      fullName,
      headline: input.headline?.trim() || null,
      phone: input.phone?.trim() || null,
      location: input.location?.trim() || null,
      linkedinUrl: input.linkedinUrl?.trim() || null,
      bio: input.summary?.trim() || null,
      skills,
      cvUrl: input.cvUrl,
    },
    workExperiences,
    education,
    certifications,
  });

  return ok({ userId: ctx.userId });
}
