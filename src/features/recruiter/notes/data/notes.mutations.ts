import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { applications } from "@/db/schema";

/** Escritura de notas internas. Cliente RLS; RLS garantiza que solo miembros de la org accedan. */

export async function updateApplicationNotes(
  applicationId: string,
  notes: string | null,
): Promise<{ id: string; notes: string | null }> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .update(applications)
      .set({ notes, updatedAt: new Date() })
      .where(eq(applications.id, applicationId))
      .returning({ id: applications.id, notes: applications.notes }),
    "db.notes.update",
  );
  return rows[0]!;
}
