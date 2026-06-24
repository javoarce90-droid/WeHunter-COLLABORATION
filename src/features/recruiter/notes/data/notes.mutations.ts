import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { applications, notes } from "@/db/schema";

/** Escritura de notas internas. Cliente RLS; RLS garantiza que solo miembros de la org accedan. */

/** Inserta una nota en el timeline (tabla `notes`). */
export async function insertNote(args: {
  organizationId: string;
  applicationId: string;
  body: string;
  createdBy: string;
}): Promise<{ noteId: string }> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .insert(notes)
      .values({
        organizationId: args.organizationId,
        applicationId: args.applicationId,
        body: args.body,
        createdBy: args.createdBy,
      })
      .returning({ id: notes.id }),
    "db.notes.insert-timeline",
  );
  return { noteId: rows[0]!.id };
}

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
