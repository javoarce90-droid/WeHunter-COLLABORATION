import { cache } from "react";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { profiles, type Profile } from "@/db/schema";

/** Lectura del perfil. Corre bajo RLS. Envolvé en cache() para evitar round-trips duplicados. */

export const getProfileById = cache(
  async (userId: string): Promise<Profile | null> => {
    const db = await getDb();
    const rows = await db.rls((tx) =>
      tx
        .select()
        .from(profiles)
        .where(eq(profiles.id, userId))
        .limit(1),
      "db.profile.get",
    );
    return rows[0] ?? null;
  }
);
