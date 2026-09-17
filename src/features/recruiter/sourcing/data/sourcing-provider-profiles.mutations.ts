import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sourcingProviderProfiles } from "@/db/schema";
import { normalizeLinkedinKey } from "../../candidates/domain/duplicate-keys";
import type { SourcingProviderCandidate } from "../domain/sourcing-provider";

/** Escrituras de la caché de perfiles ya obtenidos de un `SourcingProvider`. Cliente RLS. */

/** Upsert del perfil (por `organizationId` + `linkedinUrl` normalizada, índice único) con el
 *  payload y `fetchedAt` actuales — refresca la vigencia del caché sea el candidato nuevo o
 *  repetido (design.md §6.2, "Aclaración de mecánica"). Sin URL normalizable, no hay nada que
 *  cachear. */
export async function upsertCachedProfile(
  organizationId: string,
  candidate: SourcingProviderCandidate,
): Promise<void> {
  const key = normalizeLinkedinKey(candidate.linkedinUrl);
  if (!key) return;

  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .insert(sourcingProviderProfiles)
        .values({
          organizationId,
          linkedinUrl: key,
          payload: candidate,
          fetchedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [sourcingProviderProfiles.organizationId, sourcingProviderProfiles.linkedinUrl],
          set: {
            payload: sql`excluded.payload`,
            fetchedAt: sql`excluded.fetched_at`,
            updatedAt: new Date(),
          },
        }),
    "db.sourcing-provider-profiles.upsert",
  );
}
