import type { DraftCandidateProfile } from "@/lib/ai";
import type { CandidateResumeItems } from "../data/candidate-resume.mutations";

/**
 * Mapea el currículum de un borrador de IA (`DraftCandidateProfile`) a la forma que esperan
 * las mutations de currículum del candidato del pool. Función pura — la usan el alta por lote
 * (persiste directo) y el flujo de a uno (precarga el formulario, envolviendo con un id `temp-`).
 */
export function draftACurriculum(draft: DraftCandidateProfile): CandidateResumeItems {
  return {
    experiences: draft.workExperiences.map((e) => ({
      company: e.company,
      position: e.position,
      startDate: e.startDate,
      endDate: e.endDate,
      description: e.description,
      employmentType: e.employmentType,
      modality: e.modality,
      skills: e.skills.length > 0 ? e.skills : null,
    })),
    education: draft.education.map((e) => ({
      institution: e.institution,
      degree: e.degree,
      fieldOfStudy: e.fieldOfStudy,
      startDate: e.startDate,
      endDate: e.endDate,
      description: e.description,
      grade: e.grade,
      activities: e.activities,
    })),
    certifications: draft.certifications.map((c) => ({ name: c.name, url: c.url })),
  };
}
