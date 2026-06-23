import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { candidates } from "@/db/schema";

/** Escrituras del pool de candidatos. Cliente RLS; el organizationId acota a la org activa. */

export async function insertCandidate(args: {
  organizationId: string;
  fullName: string;
  email: string | null;
  cvUrl: string | null;
}): Promise<{ candidateId: string }> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .insert(candidates)
      .values({
        organizationId: args.organizationId,
        fullName: args.fullName,
        email: args.email,
        cvUrl: args.cvUrl,
      })
      .returning({ id: candidates.id }),
  );
  return { candidateId: rows[0]!.id };
}

export async function updateCandidateFields(
  candidateId: string,
  organizationId: string,
  // cvUrl ausente (undefined) = conservar el CV existente.
  fields: { fullName: string; email: string | null; cvUrl?: string },
): Promise<{ updated: boolean }> {
  const db = await getDb();
  const set = {
    fullName: fields.fullName,
    email: fields.email,
    updatedAt: new Date(),
    ...(fields.cvUrl !== undefined ? { cvUrl: fields.cvUrl } : {}),
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
  );
  return { updated: rows.length > 0 };
}
