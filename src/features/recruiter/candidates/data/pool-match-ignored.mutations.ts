import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { poolMatchIgnored } from "@/db/schema";

/** Escrituras de "Ignorar candidato del pool para una búsqueda" (Matchear con IA). Cliente RLS. */

/** Marca un candidato como ignorado para esta búsqueda. Idempotente: si ya está ignorado, no
 *  hace nada (unique en (job_id, candidate_id)). */
export async function ignorePoolCandidate(
  organizationId: string,
  jobId: string,
  candidateId: string,
  ignoredBy: string | null,
): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .insert(poolMatchIgnored)
        .values({ organizationId, jobId, candidateId, ignoredBy })
        .onConflictDoNothing({
          target: [poolMatchIgnored.jobId, poolMatchIgnored.candidateId],
        }),
    "db.pool-match-ignored.ignore",
  );
}

/** Deshace el "Ignorar" — el candidato vuelve a entrar al prefiltro del match de esa búsqueda. */
export async function unignorePoolCandidate(
  organizationId: string,
  jobId: string,
  candidateId: string,
): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .delete(poolMatchIgnored)
        .where(
          and(
            eq(poolMatchIgnored.organizationId, organizationId),
            eq(poolMatchIgnored.jobId, jobId),
            eq(poolMatchIgnored.candidateId, candidateId),
          ),
        ),
    "db.pool-match-ignored.unignore",
  );
}
