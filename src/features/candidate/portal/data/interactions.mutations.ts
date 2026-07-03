import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { candidateJobInteractions, type CandidateJobInteraction } from "@/db/schema";

type InteractionKind = CandidateJobInteraction["kind"];

/** Alterna favorito/ocultar: si ya existe la fila, la borra; si no, la crea. */
export async function toggleInteraction(
  userId: string,
  jobId: string,
  kind: InteractionKind,
): Promise<void> {
  const db = await getDb();
  await db.rls(async (tx) => {
    const existing = await tx
      .select({ id: candidateJobInteractions.id })
      .from(candidateJobInteractions)
      .where(
        and(
          eq(candidateJobInteractions.profileId, userId),
          eq(candidateJobInteractions.jobId, jobId),
          eq(candidateJobInteractions.kind, kind),
        ),
      )
      .limit(1);

    if (existing[0]) {
      await tx
        .delete(candidateJobInteractions)
        .where(eq(candidateJobInteractions.id, existing[0].id));
    } else {
      await tx.insert(candidateJobInteractions).values({ profileId: userId, jobId, kind });
    }
  }, "db.portal.toggleInteraction");
}
