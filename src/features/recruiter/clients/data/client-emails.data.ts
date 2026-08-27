import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { clientEmails, profiles } from "@/db/schema";

/** Historial de emails enviados a un cliente. Cliente RLS; el organizationId acota a la org
 *  activa (además de la policy `tenant_isolation` de la tabla). */

export type ClientEmailRow = {
  id: string;
  toEmail: string;
  subject: string;
  body: string;
  createdAt: Date;
  senderName: string | null;
};

const HISTORY_LIMIT = 20;

export async function listClientEmailsByClient(
  clientId: string,
  organizationId: string,
): Promise<ClientEmailRow[]> {
  const db = await getDb();
  return db.rls(
    (tx) =>
      tx
        .select({
          id: clientEmails.id,
          toEmail: clientEmails.toEmail,
          subject: clientEmails.subject,
          body: clientEmails.body,
          createdAt: clientEmails.createdAt,
          senderName: profiles.fullName,
        })
        .from(clientEmails)
        .leftJoin(profiles, eq(profiles.id, clientEmails.createdBy))
        .where(
          and(
            eq(clientEmails.clientId, clientId),
            eq(clientEmails.organizationId, organizationId),
          ),
        )
        .orderBy(desc(clientEmails.createdAt))
        .limit(HISTORY_LIMIT),
    "db.clients.emails.list",
  );
}

export async function recordClientEmail(args: {
  organizationId: string;
  clientId: string;
  toEmail: string;
  subject: string;
  body: string;
  externalId?: string;
  createdBy: string | null;
}): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx.insert(clientEmails).values({
        organizationId: args.organizationId,
        clientId: args.clientId,
        toEmail: args.toEmail,
        subject: args.subject,
        body: args.body,
        externalId: args.externalId,
        createdBy: args.createdBy,
      }),
    "db.clients.emails.record",
  );
}
