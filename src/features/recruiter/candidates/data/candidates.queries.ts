import { cache } from "react";
import { and, eq, desc, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { candidates, type Candidate } from "@/db/schema";
import {
  normalizeEmailKey,
  normalizeLinkedinKey,
  type DuplicateCandidateMatch,
} from "../domain/duplicate-keys";

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

/** Candidato existente en la misma org con el mismo email o LinkedIn (normalizados). Se
 *  usa antes de crear uno nuevo, para no cargar la misma persona dos veces sin querer. */
export async function findDuplicateCandidate(
  organizationId: string,
  args: { email?: string | null; linkedinUrl?: string | null },
): Promise<DuplicateCandidateMatch | null> {
  const email = normalizeEmailKey(args.email);
  const linkedinUrl = normalizeLinkedinKey(args.linkedinUrl);
  if (!email && !linkedinUrl) return null;

  const conditions: ReturnType<typeof sql>[] = [];
  if (email) conditions.push(sql`lower(${candidates.email}) = ${email}`);
  if (linkedinUrl) {
    conditions.push(
      sql`lower(regexp_replace(${candidates.linkedinUrl}, '/+$', '')) = ${linkedinUrl}`,
    );
  }

  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({ id: candidates.id, fullName: candidates.fullName, email: candidates.email })
        .from(candidates)
        .where(and(eq(candidates.organizationId, organizationId), or(...conditions)))
        .limit(1),
    "db.candidates.find-duplicate",
  );

  const match = rows[0];
  if (!match) return null;
  const matchedBy: "email" | "linkedin" =
    email && normalizeEmailKey(match.email) === email ? "email" : "linkedin";
  return { id: match.id, fullName: match.fullName, matchedBy };
}
