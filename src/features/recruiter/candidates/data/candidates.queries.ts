import { and, eq, desc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { candidates, type Candidate } from "@/db/schema";

/** Lecturas del pool de candidatos. Cliente RLS; además filtramos por organization activa. */

export async function listCandidates(organizationId: string): Promise<Candidate[]> {
  const db = await getDb();
  return db.rls((tx) =>
    tx
      .select()
      .from(candidates)
      .where(eq(candidates.organizationId, organizationId))
      .orderBy(desc(candidates.createdAt)),
  );
}

export async function getCandidateById(
  candidateId: string,
  organizationId: string,
): Promise<Candidate | null> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select()
      .from(candidates)
      .where(
        and(
          eq(candidates.id, candidateId),
          eq(candidates.organizationId, organizationId),
        ),
      )
      .limit(1),
  );
  return rows[0] ?? null;
}
