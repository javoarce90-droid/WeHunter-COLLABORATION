import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { clients, profiles, requisitions, type Requisition } from "@/db/schema";
import { paginationRange } from "@/lib/pagination";

/** Lecturas de solicitudes de búsqueda (§17). Cliente RLS; filtramos por organization activa. */

const LIST_LIMIT = 100;

export type RequisitionListRow = {
  id: string;
  title: string;
  position: string | null;
  status: Requisition["status"];
  reason: Requisition["reason"];
  location: string | null;
  seniority: Requisition["seniority"];
  budget: string | null;
  estimatedStartDate: string | null;
  createdAt: Date;
  clientName: string | null;
  /** Nombre de quien la cargó, cuando es un Hiring Manager interno (createdByProfileId).
   *  null en el camino Cliente (ahí lo que importa es `clientName`). */
  requestedByName: string | null;
};

/** A lo sumo UNA de las tres claves va seteada por rol — ver `isClientScoped`,
 *  `isEnterpriseAssignedScoped` e `isRequesterScoped` en `@/lib/auth/roles`. `null` explícito
 *  en cualquiera (scoping aplica pero el actor no tiene el dato — ej. recruiter Team sin
 *  cliente asignado) devuelve vacío sin ir a la base. */
export type RequisitionsScope = {
  clientId?: string | null;
  assignedToMembershipId?: string | null;
  createdByProfileId?: string | null;
};

export type RequisitionsPage = {
  requisitions: RequisitionListRow[];
  total: number;
  /** Pendientes en TODA la bandeja (con el mismo scope), no solo en la página actual — el
   *  badge del header cuenta contra el total, no contra las 10 filas visibles. */
  pendingCount: number;
};

/** Bandeja de solicitudes con el nombre del cliente (una query, sin N+1). Paginada (`page`, 10
 *  por página); el total y el conteo de pendientes salen de una segunda query, en paralelo
 *  (database.md regla #3), nunca contra las filas ya recortadas por el LIMIT. */
export async function listRequisitions(
  organizationId: string,
  scope?: RequisitionsScope,
  page: number = 1,
): Promise<RequisitionsPage> {
  if (scope && Object.values(scope).some((v) => v === null)) {
    return { requisitions: [], total: 0, pendingCount: 0 };
  }

  const db = await getDb();
  const { limit, offset } = paginationRange(page);
  const whereClause = and(
    eq(requisitions.organizationId, organizationId),
    scope?.clientId ? eq(requisitions.clientId, scope.clientId) : undefined,
    scope?.assignedToMembershipId
      ? eq(requisitions.assignedToMembershipId, scope.assignedToMembershipId)
      : undefined,
    scope?.createdByProfileId
      ? eq(requisitions.createdByProfileId, scope.createdByProfileId)
      : undefined,
  );

  const [rows, counts] = await Promise.all([
    db.rls(
      (tx) =>
        tx
          .select({
            id: requisitions.id,
            title: requisitions.title,
            position: requisitions.position,
            status: requisitions.status,
            reason: requisitions.reason,
            location: requisitions.location,
            seniority: requisitions.seniority,
            budget: requisitions.budget,
            estimatedStartDate: requisitions.estimatedStartDate,
            createdAt: requisitions.createdAt,
            clientName: clients.name,
            requestedByName: profiles.fullName,
          })
          .from(requisitions)
          .leftJoin(clients, eq(requisitions.clientId, clients.id))
          .leftJoin(profiles, eq(requisitions.createdByProfileId, profiles.id))
          .where(whereClause)
          .orderBy(desc(requisitions.createdAt))
          .limit(limit)
          .offset(offset),
      "db.requisitions.list",
    ),
    db.rls(
      (tx) =>
        tx
          .select({
            total: sql<number>`count(*)::int`,
            pending: sql<number>`count(*) filter (where ${requisitions.status} = 'pending')::int`,
          })
          .from(requisitions)
          .where(whereClause),
      "db.requisitions.counts",
    ),
  ]);

  return {
    requisitions: rows,
    total: counts[0]?.total ?? 0,
    pendingCount: counts[0]?.pending ?? 0,
  };
}

export type RequisitionByClientRow = {
  id: string;
  title: string;
  status: Requisition["status"];
  reason: Requisition["reason"];
  createdAt: Date;
};

/** Solicitudes de un cliente puntual (para su panel de detalle). */
export async function listRequisitionsByClient(
  clientId: string,
  organizationId: string,
): Promise<RequisitionByClientRow[]> {
  const db = await getDb();
  return db.rls(
    (tx) =>
      tx
        .select({
          id: requisitions.id,
          title: requisitions.title,
          status: requisitions.status,
          reason: requisitions.reason,
          createdAt: requisitions.createdAt,
        })
        .from(requisitions)
        .where(
          and(eq(requisitions.clientId, clientId), eq(requisitions.organizationId, organizationId)),
        )
        .orderBy(desc(requisitions.createdAt))
        .limit(LIST_LIMIT),
    "db.requisitions.by-client",
  );
}

export type RequisitionDetail = Requisition & { clientName: string | null };

export async function getRequisitionById(
  requisitionId: string,
  organizationId: string,
): Promise<RequisitionDetail | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({ requisition: requisitions, clientName: clients.name })
        .from(requisitions)
        .leftJoin(clients, eq(requisitions.clientId, clients.id))
        .where(
          and(
            eq(requisitions.id, requisitionId),
            eq(requisitions.organizationId, organizationId),
          ),
        )
        .limit(1),
    "db.requisitions.get",
  );
  const row = rows[0];
  return row ? { ...row.requisition, clientName: row.clientName } : null;
}

/** Lectura mínima para la autorización del dominio (no trae la JD entera). */
export async function getRequisitionStatus(
  requisitionId: string,
  organizationId: string,
): Promise<{ id: string; status: string } | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({ id: requisitions.id, status: requisitions.status })
        .from(requisitions)
        .where(
          and(
            eq(requisitions.id, requisitionId),
            eq(requisitions.organizationId, organizationId),
          ),
        )
        .limit(1),
    "db.requisitions.get-status",
  );
  return rows[0] ?? null;
}
