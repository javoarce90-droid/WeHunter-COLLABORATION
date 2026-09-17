import { and, eq, gte } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sourcingProviderProfiles } from "@/db/schema";
import { normalizeLinkedinKey } from "../../candidates/domain/duplicate-keys";
import type { SourcingProviderCandidate } from "../domain/sourcing-provider";
import { SOURCING_PROFILE_CACHE_TTL_DAYS } from "../domain/sourcing-provider-cache";

/** Lecturas de la caché de perfiles ya obtenidos de un `SourcingProvider` (control interno
 *  "no pagar dos veces" — design.md §6.2). Cliente RLS. */

/** Perfil ya obtenido para esa organización + LinkedIn URL, si hay una fila vigente (dentro
 *  del TTL) — `null` si no existe o si venció. */
export async function findCachedProfile(
  organizationId: string,
  linkedinUrl: string,
): Promise<SourcingProviderCandidate | null> {
  const key = normalizeLinkedinKey(linkedinUrl);
  if (!key) return null;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - SOURCING_PROFILE_CACHE_TTL_DAYS);

  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({ payload: sourcingProviderProfiles.payload })
        .from(sourcingProviderProfiles)
        .where(
          and(
            eq(sourcingProviderProfiles.organizationId, organizationId),
            eq(sourcingProviderProfiles.linkedinUrl, key),
            gte(sourcingProviderProfiles.fetchedAt, cutoff),
          ),
        )
        .limit(1),
    "db.sourcing-provider-profiles.find",
  );
  const row = rows[0];
  return row ? (row.payload as SourcingProviderCandidate) : null;
}
