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

export async function insertCandidate(
  args: {
    organizationId: string;
    fullName: string;
    email: string | null;
    cvUrl: string | null;
  } & CandidateDetails,
): Promise<{ candidateId: string }> {
  const db = await getDb();
  const { organizationId, fullName, email, cvUrl, ...details } = args;
  const rows = await db.rls((tx) =>
    tx
      .insert(candidates)
      .values({ organizationId, fullName, email, cvUrl, ...details })
      .returning({ id: candidates.id }),
    "db.candidates.insert",
  );
  return { candidateId: rows[0]!.id };
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
