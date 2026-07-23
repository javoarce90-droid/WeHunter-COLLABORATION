import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import type { LinkableProfile } from "../domain/profile-link";

/**
 * Busca una cuenta real (`profiles`) por email. RLS de `profiles` no deja leer perfiles ajenos
 * (0016) — la función `find_profile_for_candidate_link` es SECURITY DEFINER y expone solo lo
 * necesario para vincular. Devuelve null si no hay cuenta con ese email.
 */
export async function findLinkableProfile(email: string | null): Promise<LinkableProfile | null> {
  if (!email) return null;
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx.execute<{ result: LinkableProfile | null }>(
        sql`select find_profile_for_candidate_link(${email}) as result`,
      ),
    "db.candidates.find-linkable-profile",
  );
  return rows[0]?.result ?? null;
}
