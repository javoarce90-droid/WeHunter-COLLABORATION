import { cache } from "react";
import { and, eq, desc, or, ilike, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { candidates, type Candidate } from "@/db/schema";
import {
  normalizeEmailKey,
  normalizeLinkedinKey,
  computeDuplicates,
  type DuplicateCandidateMatch,
} from "../domain/duplicate-keys";
import type { TalentState } from "../domain/cambiar-estado-talento";
import { paginationRange } from "@/lib/pagination";

/** Lecturas del pool de candidatos. Cliente RLS; además filtramos por organization activa. */

// Cap defensivo: ningún listado sin limit (database.md regla #4). La paginación real
// (cursor + UI) queda como follow-up; por ahora cubrimos cargas razonables.
const LIST_LIMIT = 100;

export type CandidateOption = { id: string; fullName: string; email: string | null };

/** Candidatos de la org (hasta 100), solo las columnas que un picker necesita — Mensajes,
 *  Aviso y Postulados usan esto para armar su selector de candidatos, nunca la ficha completa
 *  (summary/skills/cvUrl no se leen ahí). */
export async function listCandidateOptions(
  organizationId: string,
): Promise<CandidateOption[]> {
  const db = await getDb();
  return db.rls(
    (tx) =>
      tx
        .select({ id: candidates.id, fullName: candidates.fullName, email: candidates.email })
        .from(candidates)
        .where(eq(candidates.organizationId, organizationId))
        .orderBy(desc(candidates.createdAt))
        .limit(LIST_LIMIT),
    "db.candidates.list-options",
  );
}

export type CandidateFilterKey = "all" | TalentState | "duplicates";
export type CandidateFilterCounts = Record<CandidateFilterKey, number>;

/** Conteos para los chips + el set de ids duplicados (necesita ver TODO el pool, cross-row,
 *  nunca solo una página — igual que hacía el cliente antes, ahora en el servidor). Duplicados
 *  se computa sobre las mismas hasta 100 filas (`LIST_LIMIT`) que ven el resto de los
 *  pickers — mismo alcance que tenía la detección de hoy, no es una regresión. */
export async function getCandidateFilterMeta(
  organizationId: string,
): Promise<{ counts: CandidateFilterCounts; duplicateIds: string[] }> {
  const db = await getDb();
  const [statusRows, all] = await Promise.all([
    db.rls(
      (tx) =>
        tx
          .select({
            talentState: candidates.talentState,
            n: sql<number>`count(*)::int`,
          })
          .from(candidates)
          .where(eq(candidates.organizationId, organizationId))
          .groupBy(candidates.talentState),
      "db.candidates.count-by-status",
    ),
    db.rls(
      (tx) =>
        tx
          .select({
            id: candidates.id,
            email: candidates.email,
            linkedinUrl: candidates.linkedinUrl,
          })
          .from(candidates)
          .where(eq(candidates.organizationId, organizationId))
          .orderBy(desc(candidates.createdAt))
          .limit(LIST_LIMIT),
      "db.candidates.list-for-duplicate-count",
    ),
  ]);

  const counts: CandidateFilterCounts = {
    all: 0,
    active: 0,
    passive: 0,
    contacted: 0,
    archived: 0,
    duplicates: 0,
  };
  for (const row of statusRows) {
    counts[row.talentState as TalentState] = row.n;
    counts.all += row.n;
  }
  const { duplicateIds } = computeDuplicates(all);
  counts.duplicates = duplicateIds.size;

  return { counts, duplicateIds: [...duplicateIds] };
}

/** Página de candidatos para la tabla de `/candidates` (10 por página). El filtro
 *  "duplicates" es un caso aparte: la duplicidad es cross-row (no se puede resolver con un
 *  WHERE simple), así que se computa en JS sobre el mismo fetch acotado a `LIST_LIMIT` que ya
 *  usa `getCandidateFilterMeta`, y la paginación de esa vista se aplica en memoria sobre el
 *  resultado ya filtrado. Los demás filtros (estado, texto) sí van con SQL real. */
export async function listCandidatesPage(
  organizationId: string,
  filter: CandidateFilterKey = "all",
  q: string = "",
  page: number = 1,
): Promise<{ candidates: Candidate[]; total: number }> {
  if (filter === "duplicates") {
    return listDuplicateCandidatesPage(organizationId, q, page);
  }

  const db = await getDb();
  const { limit, offset } = paginationRange(page);
  const trimmedQ = q.trim();
  const whereClause = and(
    eq(candidates.organizationId, organizationId),
    filter !== "all" ? eq(candidates.talentState, filter) : undefined,
    trimmedQ
      ? or(
          ilike(candidates.fullName, `%${trimmedQ}%`),
          ilike(candidates.email, `%${trimmedQ}%`),
        )
      : undefined,
  );

  const [rows, [{ total }]] = await Promise.all([
    db.rls(
      (tx) =>
        tx
          .select()
          .from(candidates)
          .where(whereClause)
          .orderBy(desc(candidates.createdAt))
          .limit(limit)
          .offset(offset),
      "db.candidates.list-page",
    ),
    db.rls(
      (tx) =>
        tx
          .select({ total: sql<number>`count(*)::int` })
          .from(candidates)
          .where(whereClause),
      "db.candidates.list-page-count",
    ),
  ]);

  return { candidates: rows, total };
}

async function listDuplicateCandidatesPage(
  organizationId: string,
  q: string,
  page: number,
): Promise<{ candidates: Candidate[]; total: number }> {
  const db = await getDb();
  const all = await db.rls(
    (tx) =>
      tx
        .select()
        .from(candidates)
        .where(eq(candidates.organizationId, organizationId))
        .orderBy(desc(candidates.createdAt))
        .limit(LIST_LIMIT),
    "db.candidates.list-for-duplicates",
  );

  const { duplicateIds, dupKeyOf } = computeDuplicates(all);
  const trimmedQ = q.trim().toLowerCase();
  const matches = all.filter(
    (c) =>
      duplicateIds.has(c.id) &&
      (!trimmedQ ||
        c.fullName.toLowerCase().includes(trimmedQ) ||
        (c.email ?? "").toLowerCase().includes(trimmedQ)),
  );
  // Agrupa los pares adyacentes, igual que la vista de "Duplicados" ya hacía.
  matches.sort((a, b) =>
    (dupKeyOf.get(a.id) ?? "").localeCompare(dupKeyOf.get(b.id) ?? ""),
  );

  const { limit, offset } = paginationRange(page);
  return {
    candidates: matches.slice(offset, offset + limit),
    total: matches.length,
  };
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
  const rows = await db.rls(
    (tx) =>
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
        .select({
          id: candidates.id,
          fullName: candidates.fullName,
          email: candidates.email,
        })
        .from(candidates)
        .where(
          and(eq(candidates.organizationId, organizationId), or(...conditions)),
        )
        .limit(1),
    "db.candidates.find-duplicate",
  );

  const match = rows[0];
  if (!match) return null;
  const matchedBy: "email" | "linkedin" =
    email && normalizeEmailKey(match.email) === email ? "email" : "linkedin";
  return { id: match.id, fullName: match.fullName, matchedBy };
}
