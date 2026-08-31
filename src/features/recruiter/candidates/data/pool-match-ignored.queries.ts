import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { poolMatchIgnored } from "@/db/schema";

/** Lecturas de "Ignorar candidato del pool para una búsqueda" (Matchear con IA). Cliente RLS;
 *  `organizationId` acota a la org activa (mismo criterio que el resto de candidates/data). */

/** Ids de candidatos que el equipo ignoró para esta búsqueda — `listCandidatesForPoolMatch` los
 *  excluye del prefiltro, así que no vuelven a aparecer en las siguientes tandas del match. */
export async function listIgnoredPoolCandidateIds(
  organizationId: string,
  jobId: string,
): Promise<string[]> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({ candidateId: poolMatchIgnored.candidateId })
        .from(poolMatchIgnored)
        .where(
          and(
            eq(poolMatchIgnored.organizationId, organizationId),
            eq(poolMatchIgnored.jobId, jobId),
          ),
        ),
    "db.pool-match-ignored.list",
  );
  return rows.map((r) => r.candidateId);
}
