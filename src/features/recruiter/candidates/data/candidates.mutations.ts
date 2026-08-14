import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { candidates } from "@/db/schema";
import type { CandidateDetails } from "../domain/candidate-details";
import type { TalentState } from "../domain/cambiar-estado-talento";

/** Escrituras del pool de candidatos. Cliente RLS; el organizationId acota a la org activa. */

export async function setTalentState(
  candidateId: string,
  talentState: TalentState,
): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(candidates)
        .set({ talentState, updatedAt: new Date() })
        .where(eq(candidates.id, candidateId)),
    "db.candidates.set-talent-state",
  );
}

/** Suma el candidato al pool de talento del recruiter (ver comentario en el schema:
 *  `saved_to_pool`). No toca nada de ninguna postulación — es del candidato, no de un job. */
export async function setSavedToPool(candidateId: string): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(candidates)
        .set({ savedToPool: true, updatedAt: new Date() })
        .where(eq(candidates.id, candidateId)),
    "db.candidates.set-saved-to-pool",
  );
}

export async function insertCandidate(
  args: {
    organizationId: string;
    fullName: string;
    email: string | null;
    cvUrl: string | null;
    profileId?: string | null;
  } & CandidateDetails,
): Promise<{ candidateId: string }> {
  const db = await getDb();
  const { organizationId, fullName, email, cvUrl, profileId, ...details } = args;
  const rows = await db.rls((tx) =>
    tx
      .insert(candidates)
      .values({ organizationId, fullName, email, cvUrl, profileId: profileId ?? null, ...details })
      .returning({ id: candidates.id }),
    "db.candidates.insert",
  );
  return { candidateId: rows[0]!.id };
}

/** Insert en lote de la importación masiva — un solo statement para todas las filas válidas
 *  del archivo, no un insert por fila (database.md regla #3). */
export async function insertCandidatesBatch(
  organizationId: string,
  candidatesToInsert: {
    fullName: string;
    email: string;
    phone: string | null;
    location: string | null;
    linkedinUrl: string | null;
    headline: string | null;
    skills: string[] | null;
  }[],
): Promise<{ inserted: number }> {
  if (candidatesToInsert.length === 0) return { inserted: 0 };
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .insert(candidates)
        .values(
          candidatesToInsert.map((c) => ({
            organizationId,
            fullName: c.fullName,
            email: c.email,
            phone: c.phone,
            location: c.location,
            linkedinUrl: c.linkedinUrl,
            headline: c.headline,
            skills: c.skills,
            source: "manual" as const,
          })),
        )
        .returning({ id: candidates.id }),
    "db.candidates.insert-batch",
  );
  return { inserted: rows.length };
}

export async function updateCandidateFields(
  candidateId: string,
  organizationId: string,
  // cvUrl ausente (undefined) = conservar el CV existente.
  fields: { fullName: string; email: string | null; cvUrl?: string } & CandidateDetails,
): Promise<{ updated: boolean }> {
  const db = await getDb();
  const { cvUrl, ...rest } = fields;
  const set = {
    ...rest,
    updatedAt: new Date(),
    ...(cvUrl !== undefined ? { cvUrl } : {}),
  };
  const rows = await db.rls((tx) =>
    tx
      .update(candidates)
      .set(set)
      .where(
        and(
          eq(candidates.id, candidateId),
          eq(candidates.organizationId, organizationId),
        ),
      )
      .returning({ id: candidates.id }),
    "db.candidates.update",
  );
  return { updated: rows.length > 0 };
}
