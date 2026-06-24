import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { clients } from "@/db/schema";

/** Escrituras de clientes. Cliente RLS; el organizationId acota a la org activa. */

export async function insertClient(args: {
  organizationId: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  notes: string | null;
  createdBy: string;
}): Promise<{ clientId: string }> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .insert(clients)
      .values({
        organizationId: args.organizationId,
        name: args.name,
        contactName: args.contactName,
        contactEmail: args.contactEmail,
        notes: args.notes,
        createdBy: args.createdBy,
      })
      .returning({ id: clients.id }),
    "db.clients.insert",
  );
  return { clientId: rows[0]!.id };
}

export async function updateClientFields(
  clientId: string,
  organizationId: string,
  fields: {
    name: string;
    contactName: string | null;
    contactEmail: string | null;
    notes: string | null;
  },
): Promise<{ updated: boolean }> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .update(clients)
      .set({ ...fields, updatedAt: new Date() })
      .where(and(eq(clients.id, clientId), eq(clients.organizationId, organizationId)))
      .returning({ id: clients.id }),
    "db.clients.update",
  );
  return { updated: rows.length > 0 };
}
