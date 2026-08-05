import { sql } from "drizzle-orm";
import { admin } from "@/db/client";
import type { RequisitionDraft, RequisitionReason } from "../domain/solicitar-busqueda";

/**
 * Acceso del actor CLIENTE (sin cuenta) a su portal de solicitudes.
 *
 * Toda la autorización vive en las funciones SECURITY DEFINER de Postgres
 * (`get_client_portal`, `create_client_requisition`), que validan el token y derivan de él
 * la organización y el cliente. Acá invocamos esas funciones con el cliente `admin` SOLO
 * para poder ejecutarlas sin un usuario autenticado; el admin no arma queries crudas sobre
 * las tablas. Ver migración 0055 y .claude/rules/database.md.
 */

export type RequisitionStatus = "pending" | "approved" | "rejected";

export type ClientRequisition = {
  id: string;
  title: string;
  position: string | null;
  status: RequisitionStatus;
  reason: RequisitionReason;
  location: string | null;
  seniority: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type ClientPortal = {
  shareId: string;
  clientName: string;
  organizationName: string;
  requisitions: ClientRequisition[];
};

export async function getClientPortal(token: string): Promise<ClientPortal | null> {
  const rows = await admin.execute<{ result: ClientPortal | null }>(
    sql`select get_client_portal(${token}) as result`,
  );
  return rows[0]?.result ?? null;
}

/**
 * Chequeo de vigencia del token. Reusa `get_client_portal` en vez de una función nueva: ya
 * devuelve null exactamente cuando el token no existe, está revocado o venció. Trae de más
 * (las solicitudes del cliente), pero son pocas y evita otra función SECURITY DEFINER que
 * mantener con la misma lógica de validación duplicada.
 */
export async function clientTokenEsValido(token: string): Promise<boolean> {
  return (await getClientPortal(token)) !== null;
}

export async function createRequisitionRpc(args: {
  token: string;
  draft: RequisitionDraft;
}): Promise<{ requisitionId: string } | null> {
  try {
    const rows = await admin.execute<{ id: string | null }>(
      sql`select create_client_requisition(${args.token}, ${JSON.stringify(args.draft)}::json) as id`,
    );
    const id = rows[0]?.id;
    return id ? { requisitionId: id } : null;
  } catch {
    // La función lanza excepción si el token es inválido/vencido o el payload no castea.
    return null;
  }
}

/** Detalle completo de una solicitud (todos los campos editables + estado/revisión). */
export type ClientRequisitionDetail = RequisitionDraft & {
  id: string;
  status: RequisitionStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export async function getClientRequisitionDetail(
  token: string,
  requisitionId: string,
): Promise<ClientRequisitionDetail | null> {
  const rows = await admin.execute<{ result: ClientRequisitionDetail | null }>(
    sql`select get_client_requisition(${token}, ${requisitionId}::uuid) as result`,
  );
  return rows[0]?.result ?? null;
}

/**
 * Actualiza una solicitud a nombre del cliente del token. `false` = no se pudo (token
 * inválido, id de otro cliente, o la solicitud ya fue revisada) — la función SQL no lanza
 * excepción en ese caso, solo actualiza 0 filas (a diferencia de create, acá "no corresponde"
 * es un resultado normal, no un error de programación).
 */
export async function updateRequisitionRpc(args: {
  token: string;
  requisitionId: string;
  draft: RequisitionDraft;
}): Promise<boolean> {
  try {
    const rows = await admin.execute<{ ok: boolean }>(
      sql`select update_client_requisition(${args.token}, ${args.requisitionId}::uuid, ${JSON.stringify(args.draft)}::json) as ok`,
    );
    return rows[0]?.ok ?? false;
  } catch {
    // Token inválido/vencido: la función lanza excepción (mismo caso que createRequisitionRpc).
    return false;
  }
}
