import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { profiles } from "@/db/schema";

/** Perfil del usuario actual (RLS: solo el propio). */
export async function getOwnProfile(): Promise<{ fullName: string | null; email: string } | null> {
  const db = await getDb();
  if (!db.userId) return null;
  const rows = await db.rls(
    (tx) =>
      tx
        .select({ fullName: profiles.fullName, email: profiles.email })
        .from(profiles)
        .where(eq(profiles.id, db.userId!))
        .limit(1),
    "db.settings.own-profile",
  );
  return rows[0] ?? null;
}
