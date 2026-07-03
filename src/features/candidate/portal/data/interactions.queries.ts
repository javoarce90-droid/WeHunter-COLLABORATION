import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { candidateJobInteractions } from "@/db/schema";

export interface CandidateInteractions {
  favoriteIds: string[];
  hiddenIds: string[];
}

/** Favoritos/ocultos del candidato autenticado (RLS: solo ve los suyos, own_interactions). */
export async function getMyInteractions(): Promise<CandidateInteractions> {
  const db = await getDb();
  if (!db.userId) return { favoriteIds: [], hiddenIds: [] };

  const rows = await db.rls(
    (tx) =>
      tx
        .select({ jobId: candidateJobInteractions.jobId, kind: candidateJobInteractions.kind })
        .from(candidateJobInteractions)
        .where(eq(candidateJobInteractions.profileId, db.userId!)),
    "db.portal.myInteractions",
  );

  return {
    favoriteIds: rows.filter((r) => r.kind === "favorite").map((r) => r.jobId),
    hiddenIds: rows.filter((r) => r.kind === "hidden").map((r) => r.jobId),
  };
}
