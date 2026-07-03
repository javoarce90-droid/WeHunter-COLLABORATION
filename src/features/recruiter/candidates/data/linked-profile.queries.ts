import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";

export interface LinkedCandidateProfile {
  fullName: string | null;
  email: string;
  headline: string | null;
  location: string | null;
  linkedinUrl: string | null;
  bio: string | null;
  cvUrl: string | null;
  skills: string[] | null;
  experiences: {
    id: string;
    company: string;
    position: string;
    startDate: string | null;
    endDate: string | null;
    description: string | null;
    employmentType: string | null;
    modality: string | null;
  }[];
  education: {
    id: string;
    institution: string;
    degree: string;
    fieldOfStudy: string | null;
    startDate: string | null;
    endDate: string | null;
    description: string | null;
    grade: string | null;
    activities: string | null;
  }[];
  certifications: { id: string; name: string; url: string | null }[];
}

/** Perfil real del candidato vinculado (candidates.profile_id). Null si no hay vínculo o el
 * recruiter no pertenece a la organization de ese candidato. */
export async function getLinkedCandidateProfile(
  candidateId: string,
): Promise<LinkedCandidateProfile | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx.execute<{ result: LinkedCandidateProfile | null }>(
        sql`select get_linked_candidate_profile(${candidateId}::uuid) as result`,
      ),
    "db.candidates.linkedProfile",
  );
  return rows[0]?.result ?? null;
}
