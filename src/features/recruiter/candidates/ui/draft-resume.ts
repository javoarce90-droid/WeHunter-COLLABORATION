import type {
  DraftWorkExperience,
  DraftEducation,
  DraftCertification,
} from "@/lib/ai";
import type {
  CandidateWorkExperience,
  CandidateEducation,
  CandidateCertification,
} from "@/db/schema";

/**
 * Convierte los items de currículum que extrajo la IA (contrato `Draft*`) a las filas que
 * espera `CandidateResumeFields` / el guardado del form. El `id` temporal (`temp-…`) es la
 * señal que usa `syncResumeSection` para saber que es un item nuevo a insertar, no uno
 * existente a actualizar. Lo comparten "Crear con IA" y "Actualizar con IA".
 */

export function draftExperienceRow(
  e: DraftWorkExperience,
  index: number,
  now: Date,
): CandidateWorkExperience {
  return {
    id: `temp-exp-${index}`,
    profileId: null,
    candidateId: null,
    company: e.company,
    position: e.position,
    startDate: e.startDate,
    endDate: e.endDate,
    description: e.description,
    employmentType: e.employmentType,
    modality: e.modality,
    skills: e.skills.length > 0 ? e.skills : null,
    createdAt: now,
    updatedAt: now,
  };
}

export function draftEducationRow(
  e: DraftEducation,
  index: number,
  now: Date,
): CandidateEducation {
  return {
    id: `temp-edu-${index}`,
    profileId: null,
    candidateId: null,
    institution: e.institution,
    degree: e.degree,
    fieldOfStudy: e.fieldOfStudy,
    startDate: e.startDate,
    endDate: e.endDate,
    description: e.description,
    grade: e.grade,
    activities: e.activities,
    createdAt: now,
    updatedAt: now,
  };
}

export function draftCertificationRow(
  c: DraftCertification,
  index: number,
  now: Date,
): CandidateCertification {
  return {
    id: `temp-cert-${index}`,
    profileId: null,
    candidateId: null,
    name: c.name,
    url: c.url,
    createdAt: now,
    updatedAt: now,
  };
}
