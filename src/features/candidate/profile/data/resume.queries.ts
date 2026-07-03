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

/** Currículum global del candidato autenticado (profile_id = auth.uid()), para /c/profile. */
export async function getMyResume(): Promise<{
  experiences: CandidateWorkExperience[];
  education: CandidateEducation[];
  certifications: CandidateCertification[];
}> {
  const db = await getDb();
  if (!db.userId) return { experiences: [], education: [], certifications: [] };

  const [experiences, education, certifications] = await Promise.all([
    db.rls(
      (tx) =>
        tx
          .select()
          .from(candidateWorkExperiences)
          .where(eq(candidateWorkExperiences.profileId, db.userId!))
          .orderBy(desc(candidateWorkExperiences.startDate)),
      "db.resume.myExperiences",
    ),
    db.rls(
      (tx) =>
        tx
          .select()
          .from(candidateEducation)
          .where(eq(candidateEducation.profileId, db.userId!))
          .orderBy(desc(candidateEducation.startDate)),
      "db.resume.myEducation",
    ),
    db.rls(
      (tx) =>
        tx
          .select()
          .from(candidateCertifications)
          .where(eq(candidateCertifications.profileId, db.userId!))
          .orderBy(desc(candidateCertifications.createdAt)),
      "db.resume.myCertifications",
    ),
  ]);

  return { experiences, education, certifications };
}
