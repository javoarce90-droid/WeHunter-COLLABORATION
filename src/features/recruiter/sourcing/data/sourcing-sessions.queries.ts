import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sourcingSearchSessions } from "@/db/schema";
import type { ScoredLinkedInCandidate, SourcingMetrics } from "../domain/sourcear-para-busqueda";

/** Lecturas de la sesión de trabajo en curso de "Sourcing con IA" (job + recruiter). Cliente
 *  RLS; el organizationId acota a la org activa (mismo criterio que candidates/data). */

export type SourcingSession = {
  attempt: number;
  results: ScoredLinkedInCandidate[];
  metrics: SourcingMetrics;
  isLiveApi: boolean;
};

/** Filas guardadas antes del fix de `extractSkillNames` (harvest-api-provider.ts, 2026-09-15)
 *  persistieron `skills` con el shape crudo de HarvestAPI (`{name, positions}[]`) en vez de
 *  `string[]`. Sin normalizar acá, una sesión vieja restaurada rompe el render (key duplicada /
 *  "Objects are not valid as a React child") antes de que el recruiter pueda tocar "Limpiar". */
function normalizeLegacySkills(skills: unknown): string[] {
  if (!Array.isArray(skills)) return [];
  return skills
    .map((s) => (typeof s === "string" ? s : (s as { name?: string } | null)?.name))
    .filter((s): s is string => Boolean(s && s.trim()));
}

function normalizeLegacyResults(
  results: unknown,
): ScoredLinkedInCandidate[] {
  if (!Array.isArray(results)) return [];
  return (results as ScoredLinkedInCandidate[]).map((c) => ({
    ...c,
    skills: normalizeLegacySkills(c.skills),
  }));
}

/** Sesión en curso de ESTE recruiter para este job, si existe — para restaurarla si navegó
 *  afuera mientras la búsqueda corría (ver AiJobSourcingResults.tsx). */
export async function getSourcingSession(
  organizationId: string,
  jobId: string,
  profileId: string,
): Promise<SourcingSession | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          attempt: sourcingSearchSessions.attempt,
          results: sourcingSearchSessions.results,
          metrics: sourcingSearchSessions.metrics,
          isLiveApi: sourcingSearchSessions.isLiveApi,
        })
        .from(sourcingSearchSessions)
        .where(
          and(
            eq(sourcingSearchSessions.organizationId, organizationId),
            eq(sourcingSearchSessions.jobId, jobId),
            eq(sourcingSearchSessions.profileId, profileId),
          ),
        )
        .limit(1),
    "db.sourcing-sessions.get",
  );
  const row = rows[0];
  if (!row) return null;
  return {
    attempt: row.attempt,
    results: normalizeLegacyResults(row.results),
    metrics: row.metrics as SourcingMetrics,
    isLiveApi: row.isLiveApi,
  };
}
