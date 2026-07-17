import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { profiles } from "@/db/schema";

export interface CandidateProfileFields {
  headline: string | null;
  phone: string | null;
  location: string | null;
  linkedinUrl: string | null;
  bio: string | null;
  skills: string[] | null;
  cvUrl?: string;
}

export async function updateCandidateProfile(
  userId: string,
  fields: CandidateProfileFields,
  markOnboardingComplete: boolean,
): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(profiles)
        .set({
          headline: fields.headline,
          phone: fields.phone,
          location: fields.location,
          linkedinUrl: fields.linkedinUrl,
          bio: fields.bio,
          skills: fields.skills,
          ...(fields.cvUrl ? { cvUrl: fields.cvUrl } : {}),
          ...(markOnboardingComplete ? { candidateOnboardingCompletedAt: new Date() } : {}),
        })
        .where(eq(profiles.id, userId)),
    "db.candidateProfile.update",
  );
}

export async function updateCandidateMinimumFields(
  userId: string,
  fields: { phone: string; location: string; cvUrl?: string },
): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(profiles)
        .set({
          phone: fields.phone,
          location: fields.location,
          ...(fields.cvUrl ? { cvUrl: fields.cvUrl } : {}),
        })
        .where(eq(profiles.id, userId)),
    "db.candidateProfile.updateMinimum",
  );
}

export async function markCandidateOnboardingComplete(userId: string): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(profiles)
        .set({ candidateOnboardingCompletedAt: new Date() })
        .where(eq(profiles.id, userId)),
    "db.candidateProfile.skipOnboarding",
  );
}
