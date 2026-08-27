import { and, desc, eq, isNull, or, gt, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { clientShares, jobs, shortlists, shortlistShares } from "@/db/schema";

/** Enlaces vigentes que el recruiter puede pegar en el cuerpo de un email al cliente:
 *  el portal del cliente y las shortlists compartidas de sus búsquedas. `path` es relativo
 *  (`/client/<token>`, `/share/<token>`); la URL absoluta se arma con `appUrl` en la page,
 *  mismo criterio que `ClientShareControls`. */

export type InsertableLink = { label: string; path: string };

export async function listInsertableLinksForClient(
  clientId: string,
  organizationId: string,
): Promise<InsertableLink[]> {
  const db = await getDb();
  return db.rls(async (tx) => {
    const activeClientShare = and(
      isNull(clientShares.revokedAt),
      or(isNull(clientShares.expiresAt), gt(clientShares.expiresAt, sql`now()`)),
    );
    const activeShortlistShare = and(
      isNull(shortlistShares.revokedAt),
      isNull(shortlistShares.sharedWithMembershipId),
      or(isNull(shortlistShares.expiresAt), gt(shortlistShares.expiresAt, sql`now()`)),
    );

    const [portal, lists] = await Promise.all([
      tx
        .select({ token: clientShares.token })
        .from(clientShares)
        .where(
          and(
            eq(clientShares.clientId, clientId),
            eq(clientShares.organizationId, organizationId),
            activeClientShare,
          ),
        )
        .orderBy(clientShares.createdAt)
        .limit(1),
      tx
        .selectDistinctOn([shortlists.id], {
          shortlistId: shortlists.id,
          token: shortlistShares.token,
          shortlistName: shortlists.name,
          jobTitle: jobs.title,
        })
        .from(shortlistShares)
        .innerJoin(shortlists, eq(shortlists.id, shortlistShares.shortlistId))
        .innerJoin(jobs, eq(jobs.id, shortlists.jobId))
        .where(
          and(
            eq(jobs.clientId, clientId),
            eq(jobs.organizationId, organizationId),
            activeShortlistShare,
          ),
        )
        // Un link por shortlist: si tiene varios shares activos, tomamos el más nuevo.
        .orderBy(shortlists.id, desc(shortlistShares.createdAt))
        .limit(20),
    ]);

    const links: InsertableLink[] = [];
    if (portal[0]) {
      links.push({ label: "Portal del cliente", path: `/client/${portal[0].token}` });
    }
    for (const l of lists) {
      const name = l.shortlistName?.trim() || l.jobTitle;
      links.push({ label: `Shortlist · ${name}`, path: `/share/${l.token}` });
    }
    return links;
  }, "db.clients.email-links.list");
}
