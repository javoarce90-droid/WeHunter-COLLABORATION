import { cache } from "react";
import { and, eq, desc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { candidates, type Candidate } from "@/db/schema";

/** Lecturas del pool de candidatos. Cliente RLS; además filtramos por organization activa. */

// Cap defensivo: ningún listado sin limit (database.md regla #4). La paginación real
// (cursor + UI) queda como follow-up; por ahora cubrimos cargas razonables.
const LIST_LIMIT = 100;

export async function listCandidates(organizationId: string): Promise<Candidate[]> {
  const db = await getDb();
  return db.rls(
    (tx) =>
      tx
        .select()
        .from(candidates)
        .where(eq(candidates.organizationId, organizationId))
        .orderBy(desc(candidates.createdAt))
        .limit(LIST_LIMIT),
    "db.candidates.list",
  );
}

/**
 * Un candidato por id. Cacheada por request (`cache()` de React): el layout de la ficha y
 * la pestaña Perfil la piden ambos en un mismo render y comparten una única transacción RLS.
 */
export const getCandidateById = cache(async function getCandidateById(
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
    "db.candidates.get",
  );
  return rows[0] ?? null;
});
