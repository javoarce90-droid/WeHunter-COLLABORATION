import { isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { notifications } from "@/db/schema";

/** Marca como leídas todas las notificaciones del candidato actual (RLS: solo las propias). */
export async function markAllReadForCandidate(): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(notifications)
        .set({ readAt: new Date(), updatedAt: new Date() })
        .where(isNull(notifications.readAt)),
    "db.candidate-notifications.mark-read",
  );
}
