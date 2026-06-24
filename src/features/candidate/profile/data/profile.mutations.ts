import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { profiles } from "@/db/schema";

/** Escritura del perfil de usuario. Corre bajo RLS para seguridad. */

export async function updateProfileFields(
  userId: string,
  fields: { fullName: string; cvUrl?: string },
): Promise<{ updated: boolean }> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .update(profiles)
      .set({
        fullName: fields.fullName,
        ...(fields.cvUrl !== undefined ? { cvUrl: fields.cvUrl } : {}),
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, userId))
      .returning({ id: profiles.id }),
    "db.profile.update",
  );
  return { updated: rows.length > 0 };
}
