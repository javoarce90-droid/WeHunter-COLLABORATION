import { and, count, eq, inArray, desc, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { clients, jobs, memberships, profiles, requisitions, clientShares, type Client } from "@/db/schema";
import type { OrgRole } from "@/lib/auth/session";

/** Lecturas de clientes. Cliente RLS; filtramos por organization activa. */

const LIST_LIMIT = 100;

/** Cuántos clientes tiene la org — usado por el checklist de Inicio (Freelance), no hace
 *  falta traer las filas completas para eso. */
export async function countClients(organizationId: string): Promise<number> {
  const db = await getDb();
  const [row] = await db.rls(
    (tx) =>
      tx.select({ n: count() }).from(clients).where(eq(clients.organizationId, organizationId)),
    "db.clients.count",
  );
  return row?.n ?? 0;
}

export type ClientWithStats = Client & {
  jobCount: number;
  requisitionCount: number;
  /** Si tiene al menos un link de acceso activo (ni revocado ni vencido). */
  hasActiveShare: boolean;
  /** Nombre del recruiter asignado en exclusiva, si hay alguno. */
  assignedRecruiterName: string | null;
};

/** Listado de clientes con sus contadores (búsquedas, solicitudes, si tiene link de acceso
 *  activo) — una sola query: el conteo de búsquedas por join+group, el resto por subquery
 *  correlacionada para no generar fan-out con el join (database.md regla #3). */
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
          requisitionCount: sql<number>`(
            select count(*)::int from ${requisitions}
            where ${requisitions.clientId} = ${clients.id}
          )`,
          hasActiveShare: sql<boolean>`exists(
            select 1 from ${clientShares}
            where ${clientShares.clientId} = ${clients.id}
              and ${clientShares.revokedAt} is null
              and (${clientShares.expiresAt} is null or ${clientShares.expiresAt} > now())
          )`,
          assignedRecruiterName: sql<string | null>`(
            select ${profiles.fullName} from ${memberships}
            inner join ${profiles} on ${profiles.id} = ${memberships.profileId}
            where ${memberships.assignedClientId} = ${clients.id}
            limit 1
          )`,
        })
        .from(clients)
        .leftJoin(jobs, eq(jobs.clientId, clients.id))
        .where(eq(clients.organizationId, organizationId))
        .groupBy(clients.id)
        .orderBy(desc(clients.createdAt))
        .limit(LIST_LIMIT),
    "db.clients.list-with-stats",
  );
  return rows.map(({ client, jobCount, requisitionCount, hasActiveShare, assignedRecruiterName }) => ({
    ...client,
    jobCount,
    requisitionCount,
    hasActiveShare,
    assignedRecruiterName,
  }));
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

export type AssignableRecruiter = {
  membershipId: string;
  name: string | null;
  /** Si este recruiter es el asignado en exclusiva a este cliente hoy. */
  assigned: boolean;
};

/** Recruiters activos de la org + cuál (si alguno) está asignado a este cliente — una sola
 *  query, así el select de "Recruiter asignado" trae su propio default sin una segunda
 *  transacción (database.md regla #3). */
export async function listAssignableRecruiters(
  organizationId: string,
  clientId: string,
): Promise<AssignableRecruiter[]> {
  const db = await getDb();
  return db.rls(
    (tx) =>
      tx
        .select({
          membershipId: memberships.id,
          name: profiles.fullName,
          assigned: sql<boolean>`${memberships.assignedClientId} = ${clientId}`,
        })
        .from(memberships)
        .innerJoin(profiles, eq(memberships.profileId, profiles.id))
        .where(
          and(
            eq(memberships.organizationId, organizationId),
            eq(memberships.role, "recruiter"),
            eq(memberships.status, "active"),
          ),
        )
        .orderBy(profiles.fullName)
        .limit(LIST_LIMIT),
    "db.clients.assignable-recruiters",
  );
}

export type AssignableClientOwner = {
  membershipId: string;
  name: string | null;
  role: OrgRole;
};

const CLIENT_OWNER_ROLES: OrgRole[] = ["owner", "admin", "recruiter"];

/** Candidatos a "responsable" de un cliente en el momento del alta: acá el responsable puede
 *  ser el owner, un admin o un recruiter (a diferencia de `listAssignableRecruiters`, que solo
 *  ofrece recruiters — ese selector vive en el detalle, este en el alta). */
export async function listAssignableClientOwners(
  organizationId: string,
): Promise<AssignableClientOwner[]> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          membershipId: memberships.id,
          name: profiles.fullName,
          role: memberships.role,
        })
        .from(memberships)
        .innerJoin(profiles, eq(memberships.profileId, profiles.id))
        .where(
          and(
            eq(memberships.organizationId, organizationId),
            inArray(memberships.role, CLIENT_OWNER_ROLES),
            eq(memberships.status, "active"),
          ),
        )
        .orderBy(profiles.fullName)
        .limit(LIST_LIMIT),
    "db.clients.assignable-owners",
  );
  return rows.map((r) => ({ ...r, role: r.role as OrgRole }));
}
