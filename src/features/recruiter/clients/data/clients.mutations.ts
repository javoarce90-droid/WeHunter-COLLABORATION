import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { clients, memberships } from "@/db/schema";

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

/** Un cliente, un recruiter a la vez: limpia cualquier otro membership que lo tuviera
 *  asignado antes de (opcionalmente) asignarle el nuevo. */
export async function assignRecruiterToClient(
  organizationId: string,
  clientId: string,
  membershipId: string | null,
): Promise<void> {
  const db = await getDb();
  await db.rls(async (tx) => {
    await tx
      .update(memberships)
      .set({ assignedClientId: null })
      .where(
        and(
          eq(memberships.organizationId, organizationId),
          eq(memberships.assignedClientId, clientId),
        ),
      );

    if (membershipId) {
      await tx
        .update(memberships)
        .set({ assignedClientId: clientId })
        .where(
          and(eq(memberships.id, membershipId), eq(memberships.organizationId, organizationId)),
        );
    }
  }, "db.clients.assign-recruiter");
}
