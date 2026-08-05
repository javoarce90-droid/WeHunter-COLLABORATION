import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tags, candidateTags } from "@/db/schema";

/** Escrituras de etiquetas. Cliente RLS; el organizationId acota a la org activa. */

export async function insertTag(
  organizationId: string,
  name: string,
): Promise<{ id: string; name: string }> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .insert(tags)
        .values({ organizationId, name })
        .returning({ id: tags.id, name: tags.name }),
    "db.tags.insert",
  );
  return rows[0]!;
}

export async function linkCandidateTag(args: {
  organizationId: string;
  candidateId: string;
  tagId: string;
}): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .insert(candidateTags)
        .values(args)
        .onConflictDoNothing({
          target: [candidateTags.candidateId, candidateTags.tagId],
        }),
    "db.tags.link-candidate",
  );
}

export async function unlinkCandidateTag(args: {
  organizationId: string;
  candidateId: string;
  tagId: string;
}): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .delete(candidateTags)
        .where(
          and(
            eq(candidateTags.organizationId, args.organizationId),
            eq(candidateTags.candidateId, args.candidateId),
            eq(candidateTags.tagId, args.tagId),
          ),
        ),
    "db.tags.unlink-candidate",
  );
}
