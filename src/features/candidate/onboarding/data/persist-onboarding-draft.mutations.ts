import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { profiles, candidateWorkExperiences, candidateEducation, candidateCertifications } from "@/db/schema";
import type { CandidateProfileFields } from "@/features/candidate/profile/data/profile.mutations";
import type {
  ExperienceFields,
  EducationFields,
  CertificationFields,
} from "@/features/candidate/profile/data/resume.mutations";

export interface PersistOnboardingDraftFields {
  profile: CandidateProfileFields;
  workExperiences: ExperienceFields[];
  education: EducationFields[];
  certifications: CertificationFields[];
}

/**
 * Guarda de una sola vez el resultado del onboarding con IA: perfil + experiencia + educación +
 * certificaciones. UNA transacción (no una por tabla) — cada `db.rls(...)` abre su propia
 * transacción Postgres (ver client.ts), así que llamar 4 mutations sueltas violaría la regla de
 * performance del proyecto ("una transacción, no N").
 */
export async function persistOnboardingDraft(
  userId: string,
  fields: PersistOnboardingDraftFields,
): Promise<void> {
  const db = await getDb();
  await db.rls(async (tx) => {
    await tx
      .update(profiles)
      .set({
        fullName: fields.profile.fullName,
        headline: fields.profile.headline,
        phone: fields.profile.phone,
        location: fields.profile.location,
        linkedinUrl: fields.profile.linkedinUrl,
        bio: fields.profile.bio,
        skills: fields.profile.skills,
        ...(fields.profile.cvUrl ? { cvUrl: fields.profile.cvUrl } : {}),
        candidateOnboardingCompletedAt: new Date(),
      })
      .where(eq(profiles.id, userId));

    if (fields.workExperiences.length > 0) {
      await tx.insert(candidateWorkExperiences).values(
        fields.workExperiences.map(
          (e) => ({ profileId: userId, candidateId: null, ...e }) as typeof candidateWorkExperiences.$inferInsert,
        ),
      );
    }
    if (fields.education.length > 0) {
      await tx.insert(candidateEducation).values(
        fields.education.map(
          (e) => ({ profileId: userId, candidateId: null, ...e }) as typeof candidateEducation.$inferInsert,
        ),
      );
    }
    if (fields.certifications.length > 0) {
      await tx.insert(candidateCertifications).values(
        fields.certifications.map(
          (c) => ({ profileId: userId, candidateId: null, ...c }) as typeof candidateCertifications.$inferInsert,
        ),
      );
    }
  }, "db.onboarding.persistDraft");
}
