import { randomBytes } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { clientShares } from "@/db/schema";

/** Enlaces de acceso del Cliente (§17). Cliente RLS; el organizationId acota a la org activa. */

/** Token URL-safe e impredecible para el link del cliente. */
export function generateClientShareToken(): string {
  return randomBytes(24).toString("base64url");
}

export type ClientShareRow = {
  id: string;
  token: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

export async function listSharesByClient(
  clientId: string,
  organizationId: string,
): Promise<ClientShareRow[]> {
  const db = await getDb();
  return db.rls(
    (tx) =>
      tx
        .select({
          id: clientShares.id,
          token: clientShares.token,
          expiresAt: clientShares.expiresAt,
          revokedAt: clientShares.revokedAt,
          createdAt: clientShares.createdAt,
        })
        .from(clientShares)
        .where(
          and(
            eq(clientShares.clientId, clientId),
            eq(clientShares.organizationId, organizationId),
          ),
        )
        .orderBy(desc(clientShares.createdAt)),
    "db.clients.shares.list",
  );
}

export async function getClientShareById(
  shareId: string,
  organizationId: string,
): Promise<{ id: string; revokedAt: Date | null } | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({ id: clientShares.id, revokedAt: clientShares.revokedAt })
        .from(clientShares)
        .where(
          and(eq(clientShares.id, shareId), eq(clientShares.organizationId, organizationId)),
        )
        .limit(1),
    "db.clients.share.get",
  );
  return rows[0] ?? null;
}

export async function createClientShare(args: {
  organizationId: string;
  clientId: string;
  token: string;
  expiresAt: Date | null;
  createdBy: string;
}): Promise<{ shareId: string; token: string }> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .insert(clientShares)
        .values({
          organizationId: args.organizationId,
          clientId: args.clientId,
          token: args.token,
          expiresAt: args.expiresAt,
          createdBy: args.createdBy,
        })
        .returning({ id: clientShares.id }),
    "db.clients.share.create",
  );
  return { shareId: rows[0]!.id, token: args.token };
}

export async function revokeClientShare(shareId: string): Promise<{ revoked: boolean }> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .update(clientShares)
        .set({ revokedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(clientShares.id, shareId), isNull(clientShares.revokedAt)))
        .returning({ id: clientShares.id }),
    "db.clients.share.revoke",
  );
  return { revoked: rows.length > 0 };
}
