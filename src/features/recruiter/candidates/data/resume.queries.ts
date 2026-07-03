import { eq, desc } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  candidateWorkExperiences,
  candidateEducation,
  candidateCertifications,
  type CandidateWorkExperience,
  type CandidateEducation,
  type CandidateCertification,
} from "@/db/schema";

/**
 * Currículum que el recruiter cargó a mano para un candidato de su pool (candidate_id).
 * `candidateId` ya viene validado contra `organizationId` por `getCandidateById` — RLS
 * (own_via_candidate, is_org_member vía candidates.organization_id) es la red de respaldo.
 */
export async function getCandidateResume(candidateId: string): Promise<{
  experiences: CandidateWorkExperience[];
  education: CandidateEducation[];
  certifications: CandidateCertification[];
}> {
  const db = await getDb();

  const [experiences, education, certifications] = await Promise.all([
    db.rls(
      (tx) =>
        tx
          .select()
          .from(candidateWorkExperiences)
          .where(eq(candidateWorkExperiences.candidateId, candidateId))
          .orderBy(desc(candidateWorkExperiences.startDate)),
      "db.candidates.resumeExperiences",
    ),
    db.rls(
      (tx) =>
        tx
          .select()
          .from(candidateEducation)
          .where(eq(candidateEducation.candidateId, candidateId))
          .orderBy(desc(candidateEducation.startDate)),
      "db.candidates.resumeEducation",
    ),
    db.rls(
      (tx) =>
        tx
          .select()
          .from(candidateCertifications)
          .where(eq(candidateCertifications.candidateId, candidateId))
          .orderBy(desc(candidateCertifications.createdAt)),
      "db.candidates.resumeCertifications",
    ),
  ]);

  return { experiences, education, certifications };
}
