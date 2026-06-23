import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { applications } from "@/db/schema";

/** Lectura de nota para el dominio: retorna id + notes de la application si pertenece a la org. */

export async function getApplicationForNote(
  applicationId: string,
  organizationId: string,
): Promise<{ id: string; notes: string | null } | null> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({ id: applications.id, notes: applications.notes })
      .from(applications)
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.organizationId, organizationId),
        ),
      )
      .limit(1),
    "db.notes.get-application",
  );
  return rows[0] ?? null;
}
