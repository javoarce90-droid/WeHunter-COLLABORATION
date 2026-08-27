import { cache } from "react";
import { and, eq, desc, or, ilike, sql, inArray, arrayOverlaps } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  candidates,
  candidateWorkExperiences,
  candidateEducation,
  candidateCertifications,
  candidateLanguages,
  profiles,
  type Candidate,
} from "@/db/schema";
import {
  normalizeEmailKey,
  normalizeLinkedinKey,
  computeDuplicates,
  type DuplicateCandidateMatch,
} from "../domain/duplicate-keys";
import type { TalentState } from "../domain/cambiar-estado-talento";
import { paginationRange } from "@/lib/pagination";
import type { JobSeniority } from "@/features/recruiter/jobs/domain/job-details";
import type {
  CandidateExperienceInput,
  CandidateEducationInput,
} from "@/lib/ai";
import { calcularCompletitud } from "@/features/candidate/profile/domain/calcular-completitud";
import { createKeyedCache } from "@/lib/keyed-cache";

export type CandidateCompleteness = { percent: number; faltantes: string[] };

/** Lecturas del pool de candidatos. Cliente RLS; además filtramos por organization activa. */

// Cap defensivo: ningún listado sin limit (database.md regla #4). La paginación real
// (cursor + UI) queda como follow-up; por ahora cubrimos cargas razonables.
const LIST_LIMIT = 100;

export type CandidateOption = { id: string; fullName: string; email: string | null };

// Ver keyed-cache.ts: dedupea `listCandidateOptions` ENTRE requests — Postulados y Aviso la
// piden por separado al cambiar de tab. Invalidar con `invalidateCandidateOptionsCache(orgId)`
// al crear candidatos (para que aparezcan al toque en el picker); ediciones de nombre/email
// quedan solo al TTL, bajo impacto para un picker.
const candidateOptionsCache = createKeyedCache<CandidateOption[]>(30_000);

export function invalidateCandidateOptionsCache(organizationId: string): void {
  candidateOptionsCache.invalidate(organizationId);
}

/** Candidatos de la org (hasta 100), solo las columnas que un picker necesita — Mensajes,
 *  Aviso y Postulados usan esto para armar su selector de candidatos, nunca la ficha completa
 *  (summary/skills/cvUrl no se leen ahí). */
export async function listCandidateOptions(
  organizationId: string,
): Promise<CandidateOption[]> {
  const cached = candidateOptionsCache.get(organizationId);
  if (cached !== undefined) return cached;

  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({ id: candidates.id, fullName: candidates.fullName, email: candidates.email })
        .from(candidates)
        .where(eq(candidates.organizationId, organizationId))
        .orderBy(desc(candidates.createdAt))
        .limit(LIST_LIMIT),
    "db.candidates.list-options",
  );
  candidateOptionsCache.set(organizationId, rows);
  return rows;
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
export type CompletenessFilter = "complete" | "incomplete";

export async function listCandidatesPage(
  organizationId: string,
  filter: CandidateFilterKey = "all",
  q: string = "",
  page: number = 1,
  extra: { seniority?: JobSeniority; skill?: string; completeness?: CompletenessFilter } = {},
): Promise<{ candidates: Candidate[]; total: number }> {
  if (filter === "duplicates") {
    return listDuplicateCandidatesPage(organizationId, q, page);
  }

  const db = await getDb();
  const trimmedQ = q.trim();
  const trimmedSkill = extra.skill?.trim();
  const whereClause = and(
    eq(candidates.organizationId, organizationId),
    filter !== "all" ? eq(candidates.talentState, filter) : undefined,
    trimmedQ
      ? or(
          ilike(candidates.fullName, `%${trimmedQ}%`),
          ilike(candidates.email, `%${trimmedQ}%`),
          ilike(candidates.headline, `%${trimmedQ}%`),
        )
      : undefined,
    extra.seniority ? eq(candidates.seniority, extra.seniority) : undefined,
    trimmedSkill
      ? sql`EXISTS (SELECT 1 FROM unnest(${candidates.skills}) s WHERE s ILIKE ${`%${trimmedSkill}%`})`
      : undefined,
  );

  // Completitud no es una columna: no se puede resolver con WHERE. Mismo camino que ya usa
  // `listDuplicateCandidatesPage` — trae hasta LIST_LIMIT con los demás filtros ya aplicados
  // por SQL, calcula en JS y pagina en memoria. Solo se activa si el reclutador usa el filtro.
  if (extra.completeness) {
    return listCandidatesPageByCompleteness(whereClause, extra.completeness, page);
  }

  const { limit, offset } = paginationRange(page);
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

async function listCandidatesPageByCompleteness(
  whereClause: ReturnType<typeof and>,
  completeness: CompletenessFilter,
  page: number,
): Promise<{ candidates: Candidate[]; total: number }> {
  const db = await getDb();
  const all = await db.rls(
    (tx) =>
      tx
        .select()
        .from(candidates)
        .where(whereClause)
        .orderBy(desc(candidates.createdAt))
        .limit(LIST_LIMIT),
    "db.candidates.list-for-completeness",
  );
  if (all.length === 0) return { candidates: [], total: 0 };

  const counts = await getResumeCountsForCandidates(
    all.map((c) => ({ id: c.id, profileId: c.profileId })),
  );
  const matches = all.filter((c) => {
    const { percent } = completenessForCandidate(c, counts.get(c.id)!);
    return completeness === "complete" ? percent >= 70 : percent < 40;
  });

  const { limit, offset } = paginationRange(page);
  return {
    candidates: matches.slice(offset, offset + limit),
    total: matches.length,
  };
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

/**
 * Solo el resumen/bio de un candidato — para la ficha de detalle desde Postulados/Pipeline,
 * que ya recibe el resto de los campos (email, teléfono, ubicación, skills, CV, LinkedIn) por
 * props (vienen incluidos en `listPostulados`/`listApplicationsByJob`). Pedir la fila
 * completa con `getCandidateById` ahí sería redundante — esto trae 1 sola columna.
 */
export async function getCandidateSummary(
  candidateId: string,
  organizationId: string,
): Promise<string | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({ summary: candidates.summary })
        .from(candidates)
        .where(
          and(
            eq(candidates.id, candidateId),
            eq(candidates.organizationId, organizationId),
          ),
        )
        .limit(1),
    "db.candidates.summary",
  );
  return rows[0]?.summary ?? null;
}

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

/** Qué emails (de la lista dada, ya normalizados por el caller) ya existen en el pool de la
 *  organización — UNA query para todo el lote, nunca una por fila (importación masiva). */
export async function findExistingEmails(
  organizationId: string,
  emails: string[],
): Promise<Set<string>> {
  if (emails.length === 0) return new Set();
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({ email: candidates.email })
        .from(candidates)
        .where(
          and(
            eq(candidates.organizationId, organizationId),
            inArray(sql`lower(${candidates.email})`, emails),
          ),
        ),
    "db.candidates.find-existing-emails",
  );
  return new Set(
    rows.map((r) => normalizeEmailKey(r.email)).filter((e): e is string => e !== null),
  );
}

/** Qué linkedinUrls (sin normalizar — esta función normaliza) ya existen en el pool de la
 *  organización — UNA query para todo el lote, nunca una por candidato (ej. sourcing con IA,
 *  hasta 10 candidatos por tanda). Devuelve las urls ya normalizadas para comparar con `.has()`
 *  usando `normalizeLinkedinKey` sobre cada candidato del lado del caller. */
export async function findExistingLinkedinUrls(
  organizationId: string,
  linkedinUrls: string[],
): Promise<Set<string>> {
  const normalized = linkedinUrls
    .map((u) => normalizeLinkedinKey(u))
    .filter((u): u is string => u !== null);
  if (normalized.length === 0) return new Set();

  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({ linkedinUrl: candidates.linkedinUrl })
        .from(candidates)
        .where(
          and(
            eq(candidates.organizationId, organizationId),
            inArray(
              sql`lower(regexp_replace(${candidates.linkedinUrl}, '/+$', ''))`,
              normalized,
            ),
          ),
        ),
    "db.candidates.find-existing-linkedin-urls",
  );
  return new Set(
    rows
      .map((r) => normalizeLinkedinKey(r.linkedinUrl))
      .filter((u): u is string => u !== null),
  );
}

export type ResumeCounts = {
  experiences: number;
  education: number;
  certifications: number;
  languages: number;
};

/** Cuenta (no trae contenido) las 4 secciones de resume de un lote de candidatos, en 4
 *  queries acotadas — mismo patrón dual candidateId|profileId que ya usa
 *  `listCandidatesForPoolMatch` para experiencia/educación, extendido a certifications/
 *  languages. Solo importa existencia (para completitud), nunca el contenido. */
export async function getResumeCountsForCandidates(
  rows: { id: string; profileId: string | null }[],
): Promise<Map<string, ResumeCounts>> {
  const result = new Map<string, ResumeCounts>();
  for (const r of rows) {
    result.set(r.id, { experiences: 0, education: 0, certifications: 0, languages: 0 });
  }
  if (rows.length === 0) return result;

  const db = await getDb();
  const candidateIds = rows.map((r) => r.id);
  const profileIds = rows.map((r) => r.profileId).filter((id): id is string => id != null);
  const candidateIdByOwnerKey = new Map<string, string>();
  for (const r of rows) {
    candidateIdByOwnerKey.set(r.profileId ? `p:${r.profileId}` : `c:${r.id}`, r.id);
  }

  function tally(
    field: keyof ResumeCounts,
    list: { candidateId: string | null; profileId: string | null }[],
  ) {
    for (const item of list) {
      const ownerKey = item.profileId ? `p:${item.profileId}` : `c:${item.candidateId}`;
      const candidateId = candidateIdByOwnerKey.get(ownerKey);
      if (candidateId) result.get(candidateId)![field] += 1;
    }
  }

  const [experiences, education, certifications, languages] = await Promise.all([
    db.rls(
      (tx) =>
        tx
          .select({
            candidateId: candidateWorkExperiences.candidateId,
            profileId: candidateWorkExperiences.profileId,
          })
          .from(candidateWorkExperiences)
          .where(
            or(
              inArray(candidateWorkExperiences.candidateId, candidateIds),
              profileIds.length > 0
                ? inArray(candidateWorkExperiences.profileId, profileIds)
                : undefined,
            ),
          ),
      "db.candidates.completeness.experience",
    ),
    db.rls(
      (tx) =>
        tx
          .select({
            candidateId: candidateEducation.candidateId,
            profileId: candidateEducation.profileId,
          })
          .from(candidateEducation)
          .where(
            or(
              inArray(candidateEducation.candidateId, candidateIds),
              profileIds.length > 0
                ? inArray(candidateEducation.profileId, profileIds)
                : undefined,
            ),
          ),
      "db.candidates.completeness.education",
    ),
    db.rls(
      (tx) =>
        tx
          .select({
            candidateId: candidateCertifications.candidateId,
            profileId: candidateCertifications.profileId,
          })
          .from(candidateCertifications)
          .where(
            or(
              inArray(candidateCertifications.candidateId, candidateIds),
              profileIds.length > 0
                ? inArray(candidateCertifications.profileId, profileIds)
                : undefined,
            ),
          ),
      "db.candidates.completeness.certifications",
    ),
    db.rls(
      (tx) =>
        tx
          .select({
            candidateId: candidateLanguages.candidateId,
            profileId: candidateLanguages.profileId,
          })
          .from(candidateLanguages)
          .where(
            or(
              inArray(candidateLanguages.candidateId, candidateIds),
              profileIds.length > 0
                ? inArray(candidateLanguages.profileId, profileIds)
                : undefined,
            ),
          ),
      "db.candidates.completeness.languages",
    ),
  ]);

  tally("experiences", experiences);
  tally("education", education);
  tally("certifications", certifications);
  tally("languages", languages);

  return result;
}

/** Adapta counts (existencia) al shape que espera `calcularCompletitud` (arrays, solo importa
 *  `.length`) y arma el `CompletitudProfile` desde los campos crudos del candidato — sin
 *  fusionar con el perfil vinculado (a diferencia de `listCandidatesForPoolMatch`, que sí lo
 *  hace porque es lo que efectivamente ve la IA al scorear). */
export function completenessForCandidate(
  candidate: Pick<Candidate, "headline" | "summary" | "location" | "phone" | "cvUrl" | "skills">,
  counts: ResumeCounts,
): CandidateCompleteness {
  return calcularCompletitud(
    {
      headline: candidate.headline,
      bio: candidate.summary,
      location: candidate.location,
      phone: candidate.phone,
      cvUrl: candidate.cvUrl,
      skills: candidate.skills,
    },
    {
      experiences: Array(counts.experiences),
      education: Array(counts.education),
      certifications: Array(counts.certifications),
      languages: Array(counts.languages),
    },
  );
}

export type PoolMatchCandidate = {
  id: string;
  fullName: string;
  headline: string | null;
  completeness: CandidateCompleteness;
  /** Snapshot para invalidar el caché de "Matchear con IA" (ver pool-match-cache.queries.ts):
   *  si el candidato cambió desde el último score, no se reusa. */
  updatedAt: Date;
  candidate: {
    id: string;
    skills: string[] | null;
    summary: string | null;
    source: string | null;
    experience: CandidateExperienceInput[];
    education: CandidateEducationInput[];
  };
};

/**
 * Candidatos del pool prefiltrados para matchear con IA contra una búsqueda (sourcing interno):
 * acota por overlap de skills con el job (operador `&&` de Postgres) y excluye archivados —
 * esto es lo que evita correr la IA contra todo el pool. Si el job matchea seniority, esos
 * candidatos van primero; el desempate final es recencia. Tope duro en `limit` (ver
 * `POOL_MATCH_MAX_CANDIDATES` en sourcing/domain) — cada resultado es una llamada real a la IA.
 */
export async function listCandidatesForPoolMatch(
  organizationId: string,
  job: { skills: string[] | null; seniority: JobSeniority | null },
  limit: number,
): Promise<PoolMatchCandidate[]> {
  const db = await getDb();
  const hasJobSkills = Boolean(job.skills && job.skills.length > 0);
  const whereClause = and(
    eq(candidates.organizationId, organizationId),
    sql`${candidates.talentState} <> 'archived'`,
    hasJobSkills ? arrayOverlaps(candidates.skills, job.skills!) : undefined,
  );

  const orderBy = job.seniority
    ? [sql`(${candidates.seniority} = ${job.seniority}) DESC`, desc(candidates.updatedAt)]
    : [desc(candidates.updatedAt)];

  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          id: candidates.id,
          fullName: candidates.fullName,
          headline: candidates.headline,
          profileId: candidates.profileId,
          skills: candidates.skills,
          summary: candidates.summary,
          source: candidates.source,
          location: candidates.location,
          phone: candidates.phone,
          cvUrl: candidates.cvUrl,
          updatedAt: candidates.updatedAt,
          profileBio: profiles.bio,
          profileSkills: profiles.skills,
        })
        .from(candidates)
        .leftJoin(profiles, eq(candidates.profileId, profiles.id))
        .where(whereClause)
        .orderBy(...orderBy)
        .limit(limit),
    "db.candidates.list-for-pool-match",
  );
  if (rows.length === 0) return [];

  // Experiencia/educación en 2 queries acotadas para todo el lote — mismo patrón que
  // listApplicationsForScoring (nunca una query por candidato). Certifications/languages se
  // suman solo para completitud (no entran al contrato de scoring de IA).
  const candidateIds = rows.map((r) => r.id);
  const profileIds = rows
    .map((r) => r.profileId)
    .filter((id): id is string => id != null);
  const [experiences, educations, certifications, languages] = await Promise.all([
    db.rls(
      (tx) =>
        tx
          .select({
            candidateId: candidateWorkExperiences.candidateId,
            profileId: candidateWorkExperiences.profileId,
            company: candidateWorkExperiences.company,
            position: candidateWorkExperiences.position,
            description: candidateWorkExperiences.description,
          })
          .from(candidateWorkExperiences)
          .where(
            or(
              inArray(candidateWorkExperiences.candidateId, candidateIds),
              profileIds.length > 0
                ? inArray(candidateWorkExperiences.profileId, profileIds)
                : undefined,
            ),
          ),
      "db.candidates.for-pool-match.experience",
    ),
    db.rls(
      (tx) =>
        tx
          .select({
            candidateId: candidateEducation.candidateId,
            profileId: candidateEducation.profileId,
            degree: candidateEducation.degree,
            institution: candidateEducation.institution,
            fieldOfStudy: candidateEducation.fieldOfStudy,
          })
          .from(candidateEducation)
          .where(
            or(
              inArray(candidateEducation.candidateId, candidateIds),
              profileIds.length > 0
                ? inArray(candidateEducation.profileId, profileIds)
                : undefined,
            ),
          ),
      "db.candidates.for-pool-match.education",
    ),
    db.rls(
      (tx) =>
        tx
          .select({
            candidateId: candidateCertifications.candidateId,
            profileId: candidateCertifications.profileId,
          })
          .from(candidateCertifications)
          .where(
            or(
              inArray(candidateCertifications.candidateId, candidateIds),
              profileIds.length > 0
                ? inArray(candidateCertifications.profileId, profileIds)
                : undefined,
            ),
          ),
      "db.candidates.for-pool-match.certifications",
    ),
    db.rls(
      (tx) =>
        tx
          .select({
            candidateId: candidateLanguages.candidateId,
            profileId: candidateLanguages.profileId,
          })
          .from(candidateLanguages)
          .where(
            or(
              inArray(candidateLanguages.candidateId, candidateIds),
              profileIds.length > 0
                ? inArray(candidateLanguages.profileId, profileIds)
                : undefined,
            ),
          ),
      "db.candidates.for-pool-match.languages",
    ),
  ]);

  const expByKey = new Map<string, CandidateExperienceInput[]>();
  for (const e of experiences) {
    const key = e.profileId ? `p:${e.profileId}` : `c:${e.candidateId}`;
    const list = expByKey.get(key) ?? [];
    list.push({ position: e.position, company: e.company, description: e.description });
    expByKey.set(key, list);
  }
  const eduByKey = new Map<string, CandidateEducationInput[]>();
  for (const e of educations) {
    const key = e.profileId ? `p:${e.profileId}` : `c:${e.candidateId}`;
    const list = eduByKey.get(key) ?? [];
    list.push({ degree: e.degree, institution: e.institution, fieldOfStudy: e.fieldOfStudy });
    eduByKey.set(key, list);
  }
  const countByKey = new Map<string, { certifications: number; languages: number }>();
  for (const c of certifications) {
    const key = c.profileId ? `p:${c.profileId}` : `c:${c.candidateId}`;
    const entry = countByKey.get(key) ?? { certifications: 0, languages: 0 };
    entry.certifications += 1;
    countByKey.set(key, entry);
  }
  for (const l of languages) {
    const key = l.profileId ? `p:${l.profileId}` : `c:${l.candidateId}`;
    const entry = countByKey.get(key) ?? { certifications: 0, languages: 0 };
    entry.languages += 1;
    countByKey.set(key, entry);
  }

  return rows.map((r) => {
    const key = r.profileId ? `p:${r.profileId}` : `c:${r.id}`;
    const experience = expByKey.get(key) ?? [];
    const education = eduByKey.get(key) ?? [];
    const { certifications: certCount, languages: langCount } = countByKey.get(key) ?? {
      certifications: 0,
      languages: 0,
    };
    const completeness = calcularCompletitud(
      {
        headline: r.headline,
        bio: r.summary ?? r.profileBio,
        location: r.location,
        phone: r.phone,
        cvUrl: r.cvUrl,
        skills: r.skills?.length ? r.skills : r.profileSkills,
      },
      {
        experiences: experience,
        education,
        certifications: Array(certCount),
        languages: Array(langCount),
      },
    );
    return {
      id: r.id,
      fullName: r.fullName,
      headline: r.headline,
      completeness,
      updatedAt: r.updatedAt,
      candidate: {
        id: r.id,
        skills: r.skills?.length ? r.skills : r.profileSkills,
        summary: r.summary ?? r.profileBio,
        source: r.source,
        experience,
        education,
      },
    };
  });
}
