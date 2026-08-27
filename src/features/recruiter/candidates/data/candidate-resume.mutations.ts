import { getDb } from "@/db/client";
import {
  candidateWorkExperiences,
  candidateEducation,
  candidateCertifications,
} from "@/db/schema";
import type {
  ExperienceFields,
  EducationFields,
  CertificationFields,
} from "@/features/candidate/profile/data/resume.mutations";

export interface CandidateResumeItems {
  experiences: ExperienceFields[];
  education: EducationFields[];
  certifications: CertificationFields[];
}

/**
 * Inserta de una sola vez el currículum de un candidato del pool (dueño = `candidate_id`,
 * `profile_id` null: es carga del recruiter, la persona no es usuaria). UNA transacción para
 * las 3 tablas — `db.rls()` abre una transacción Postgres por llamada, así que llamar las
 * mutations sueltas violaría la regla de performance del proyecto (database.md #3).
 *
 * Solo alta (no diff contra lo existente): lo usa el flujo "Crear con IA" recién creado el
 * candidato, cuando todavía no tiene currículum. La edición posterior va por `syncResumeSection`.
 */
export async function insertCandidateResumeItems(
  candidateId: string,
  items: CandidateResumeItems,
): Promise<void> {
  if (
    items.experiences.length === 0 &&
    items.education.length === 0 &&
    items.certifications.length === 0
  ) {
    return;
  }

  const db = await getDb();
  await db.rls(async (tx) => {
    if (items.experiences.length > 0) {
      await tx.insert(candidateWorkExperiences).values(
        items.experiences.map(
          (e) =>
            ({ candidateId, profileId: null, ...e }) as typeof candidateWorkExperiences.$inferInsert,
        ),
      );
    }
    if (items.education.length > 0) {
      await tx.insert(candidateEducation).values(
        items.education.map(
          (e) =>
            ({ candidateId, profileId: null, ...e }) as typeof candidateEducation.$inferInsert,
        ),
      );
    }
    if (items.certifications.length > 0) {
      await tx.insert(candidateCertifications).values(
        items.certifications.map(
          (c) =>
            ({ candidateId, profileId: null, ...c }) as typeof candidateCertifications.$inferInsert,
        ),
      );
    }
  }, "db.candidates.insertResumeItems");
}
