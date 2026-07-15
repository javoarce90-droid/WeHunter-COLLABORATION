import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  profiles,
  candidateWorkExperiences,
  candidateEducation,
  candidateCertifications,
  candidateJobInteractions,
} from "@/db/schema";

/** El path del CV hay que leerlo ANTES de anonimizar el perfil (lo pisa a null). */
export async function getProfileCvPath(profileId: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) => tx.select({ cvUrl: profiles.cvUrl }).from(profiles).where(eq(profiles.id, profileId)).limit(1),
    "db.account-deletion.get-cv-path",
  );
  return rows[0]?.cvUrl ?? null;
}

/** Currículum del candidato (experiencia, educación, certificaciones, favoritos de jobs):
 * es 100% suyo, sin valor histórico para ninguna organización — se borra, no se anonimiza. */
export async function deleteResumeData(profileId: string): Promise<void> {
  const db = await getDb();
  await db.rls(async (tx) => {
    await tx.delete(candidateWorkExperiences).where(eq(candidateWorkExperiences.profileId, profileId));
    await tx.delete(candidateEducation).where(eq(candidateEducation.profileId, profileId));
    await tx.delete(candidateCertifications).where(eq(candidateCertifications.profileId, profileId));
    await tx.delete(candidateJobInteractions).where(eq(candidateJobInteractions.profileId, profileId));
  }, "db.account-deletion.delete-resume-data");
}

/** Limpia toda la PII de `profiles` sin borrar la fila (mantiene `candidates.profileId` y el
 * histórico de `applications` intactos — ver eliminar-cuenta.ts). `email` es NOT NULL, así
 * que necesita un placeholder único en vez de null. */
export async function anonymizeProfile(profileId: string): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(profiles)
        .set({
          email: `eliminado-${profileId}@wehunter.invalid`,
          fullName: null,
          cvUrl: null,
          avatarUrl: null,
          jobTitle: null,
          phone: null,
          location: null,
          linkedinUrl: null,
          bio: null,
          headline: null,
          skills: null,
        })
        .where(eq(profiles.id, profileId)),
    "db.account-deletion.anonymize-profile",
  );
}
