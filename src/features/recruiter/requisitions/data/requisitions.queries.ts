import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { clients, requisitions, type Requisition } from "@/db/schema";

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
};

/** Bandeja de solicitudes con el nombre del cliente (una query, sin N+1).
 *  `scopeToClientId` acota a las solicitudes de ESE cliente (recruiter en workspace Team,
 *  ver `isClientScoped` en `@/lib/auth/roles`). `null` explícito (scoping aplica pero el
 *  recruiter no tiene cliente asignado) devuelve vacío sin ir a la base. */
export async function listRequisitions(
  organizationId: string,
  scopeToClientId?: string | null,
): Promise<RequisitionListRow[]> {
  if (scopeToClientId === null) return [];

  const db = await getDb();
  return db.rls(
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
        })
        .from(requisitions)
        .leftJoin(clients, eq(requisitions.clientId, clients.id))
        .where(
          and(
            eq(requisitions.organizationId, organizationId),
            scopeToClientId ? eq(requisitions.clientId, scopeToClientId) : undefined,
          ),
        )
        .orderBy(desc(requisitions.createdAt))
        .limit(LIST_LIMIT),
    "db.requisitions.list",
  );
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
