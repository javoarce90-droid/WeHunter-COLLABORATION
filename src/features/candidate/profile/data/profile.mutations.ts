import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { profiles } from "@/db/schema";

export interface CandidateProfileFields {
  fullName: string;
  headline: string | null;
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
          fullName: fields.fullName,
          headline: fields.headline,
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
