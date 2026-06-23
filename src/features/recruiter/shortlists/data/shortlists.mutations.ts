import { randomBytes } from "node:crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  shortlists,
  shortlistCandidates,
  shortlistShares,
  applications,
} from "@/db/schema";

/** Escrituras de shortlists. Cliente RLS; el organizationId acota a la org activa. */

/** Token URL-safe e impredecible para el link de la empresa. */
export function generateShareToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function createShortlistWithCandidates(args: {
  organizationId: string;
  jobId: string;
  name: string;
  createdBy: string;
  applicationIds: string[];
}): Promise<{ shortlistId: string }> {
  const db = await getDb();
  return db.rls(async (tx) => {
    const inserted = await tx
      .insert(shortlists)
      .values({
        organizationId: args.organizationId,
        jobId: args.jobId,
        name: args.name,
        createdBy: args.createdBy,
      })
      .returning({ id: shortlists.id });

    const shortlistId = inserted[0]!.id;

    await tx.insert(shortlistCandidates).values(
      args.applicationIds.map((applicationId) => ({
        organizationId: args.organizationId,
        shortlistId,
        applicationId,
      })),
    );

    return { shortlistId };
  }, "db.shortlists.create");
}

/** De los applicationIds pedidos, devuelve los que realmente son del job y la org. */
export async function filterValidApplications(
  jobId: string,
  organizationId: string,
  applicationIds: string[],
): Promise<string[]> {
  if (applicationIds.length === 0) return [];
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({ id: applications.id })
      .from(applications)
      .where(
        and(
          eq(applications.jobId, jobId),
          eq(applications.organizationId, organizationId),
          inArray(applications.id, applicationIds),
        ),
      ),
    "db.shortlists.validate-apps",
  );
  return rows.map((r) => r.id);
}

export async function createShare(args: {
  organizationId: string;
  shortlistId: string;
  token: string;
  expiresAt: Date | null;
  createdBy: string;
}): Promise<{ shareId: string; token: string }> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .insert(shortlistShares)
      .values({
        organizationId: args.organizationId,
        shortlistId: args.shortlistId,
        token: args.token,
        expiresAt: args.expiresAt,
        createdBy: args.createdBy,
      })
      .returning({ id: shortlistShares.id }),
    "db.shortlists.share.create",
  );
  return { shareId: rows[0]!.id, token: args.token };
}

export async function revokeShare(
  shareId: string,
): Promise<{ revoked: boolean }> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .update(shortlistShares)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(shortlistShares.id, shareId), isNull(shortlistShares.revokedAt)))
      .returning({ id: shortlistShares.id }),
    "db.shortlists.share.revoke",
  );
  return { revoked: rows.length > 0 };
}
