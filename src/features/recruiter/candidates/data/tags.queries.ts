import { and, eq, inArray, sql, asc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tags, candidateTags } from "@/db/schema";

export type CandidateTagRow = { id: string; name: string };

/** Lecturas de etiquetas. Cliente RLS; acotado siempre por organization activa. */

export async function findTagByName(
  organizationId: string,
  name: string,
): Promise<CandidateTagRow | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({ id: tags.id, name: tags.name })
        .from(tags)
        .where(
          and(
            eq(tags.organizationId, organizationId),
            eq(sql`lower(${tags.name})`, name.toLowerCase()),
          ),
        )
        .limit(1),
    "db.tags.find-by-name",
  );
  return rows[0] ?? null;
}

export async function listTagsForCandidate(
  candidateId: string,
  organizationId: string,
): Promise<CandidateTagRow[]> {
  const db = await getDb();
  return db.rls(
    (tx) =>
      tx
        .select({ id: tags.id, name: tags.name })
        .from(candidateTags)
        .innerJoin(tags, eq(tags.id, candidateTags.tagId))
        .where(
          and(
            eq(candidateTags.candidateId, candidateId),
            eq(candidateTags.organizationId, organizationId),
          ),
        )
        .orderBy(asc(tags.name)),
    "db.tags.list-for-candidate",
  );
}

/** Bulk: todas las etiquetas de un set de candidatos en una sola query (database.md #6 —
 * nada de N+1 por card del tablero). */
export async function listTagsByCandidateIds(
  candidateIds: string[],
  organizationId: string,
): Promise<{ candidateId: string; id: string; name: string }[]> {
  if (candidateIds.length === 0) return [];
  const db = await getDb();
  return db.rls(
    (tx) =>
      tx
        .select({ candidateId: candidateTags.candidateId, id: tags.id, name: tags.name })
        .from(candidateTags)
        .innerJoin(tags, eq(tags.id, candidateTags.tagId))
        .where(
          and(
            inArray(candidateTags.candidateId, candidateIds),
            eq(candidateTags.organizationId, organizationId),
          ),
        )
        .orderBy(asc(tags.name)),
    "db.tags.list-by-candidate-ids",
  );
}
