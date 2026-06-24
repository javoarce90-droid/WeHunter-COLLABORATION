import { and, eq, desc, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { clients, jobs, type Client } from "@/db/schema";

/** Lecturas de clientes. Cliente RLS; filtramos por organization activa. */

const LIST_LIMIT = 100;

export type ClientWithStats = Client & { jobCount: number };

/** Listado de clientes con la cantidad de búsquedas vinculadas (una query, sin N+1). */
export async function listClientsWithStats(
  organizationId: string,
): Promise<ClientWithStats[]> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          client: clients,
          jobCount: sql<number>`count(${jobs.id})::int`,
        })
        .from(clients)
        .leftJoin(jobs, eq(jobs.clientId, clients.id))
        .where(eq(clients.organizationId, organizationId))
        .groupBy(clients.id)
        .orderBy(desc(clients.createdAt))
        .limit(LIST_LIMIT),
    "db.clients.list-with-stats",
  );
  return rows.map(({ client, jobCount }) => ({ ...client, jobCount }));
}

/** Listado mínimo (id + nombre) para selects. */
export async function listClientsForSelect(
  organizationId: string,
): Promise<{ id: string; name: string }[]> {
  const db = await getDb();
  return db.rls(
    (tx) =>
      tx
        .select({ id: clients.id, name: clients.name })
        .from(clients)
        .where(eq(clients.organizationId, organizationId))
        .orderBy(desc(clients.createdAt))
        .limit(LIST_LIMIT),
    "db.clients.for-select",
  );
}

export async function getClientById(
  clientId: string,
  organizationId: string,
): Promise<Client | null> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select()
      .from(clients)
      .where(and(eq(clients.id, clientId), eq(clients.organizationId, organizationId)))
      .limit(1),
    "db.clients.get",
  );
  return rows[0] ?? null;
}

/** Búsquedas vinculadas a un cliente (para el detalle del cliente). */
export async function listJobsByClient(
  clientId: string,
  organizationId: string,
): Promise<{ id: string; title: string; status: string; updatedAt: Date }[]> {
  const db = await getDb();
  return db.rls(
    (tx) =>
      tx
        .select({
          id: jobs.id,
          title: jobs.title,
          status: jobs.status,
          updatedAt: jobs.updatedAt,
        })
        .from(jobs)
        .where(and(eq(jobs.clientId, clientId), eq(jobs.organizationId, organizationId)))
        .orderBy(desc(jobs.updatedAt))
        .limit(LIST_LIMIT),
    "db.clients.jobs-by-client",
  );
}
