import { eq, desc } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  candidateWorkExperiences,
  candidateEducation,
  candidateCertifications,
  candidateLanguages,
  type CandidateWorkExperience,
  type CandidateEducation,
  type CandidateCertification,
  type CandidateLanguage,
} from "@/db/schema";

/** Currículum global del candidato autenticado (profile_id = auth.uid()), para /c/profile. */
export async function getMyResume(): Promise<{
  experiences: CandidateWorkExperience[];
  education: CandidateEducation[];
  certifications: CandidateCertification[];
  languages: CandidateLanguage[];
}> {
  const db = await getDb();
  if (!db.userId) return { experiences: [], education: [], certifications: [], languages: [] };

  const [experiences, education, certifications, languages] = await Promise.all([
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
    db.rls(
      (tx) =>
        tx
          .select()
          .from(candidateLanguages)
          .where(eq(candidateLanguages.profileId, db.userId!))
          .orderBy(desc(candidateLanguages.createdAt)),
      "db.resume.myLanguages",
    ),
  ]);

  return { experiences, education, certifications, languages };
}
