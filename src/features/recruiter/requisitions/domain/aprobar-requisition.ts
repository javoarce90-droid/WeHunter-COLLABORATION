import { ok, err, type Result } from "@/lib/result";
import { canReviewRequisitions } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";

/**
 * Caso de uso: el recruiter aprueba una solicitud del cliente y se genera la búsqueda
 * vinculada (§17 backlog). La requisition NO se reemplaza por el job: son entidades
 * distintas y quedan vinculadas por `requisitions.job_id`.
 *
 * El job nace en `draft`, igual que uno creado a mano: aprobar la solicitud no publica
 * nada, solo habilita al recruiter a terminar de armar el aviso.
 */

export interface AprobarRequisitionInput {
  requisitionId: string;
  reviewNote?: string | null;
}

export interface AprobarRequisitionCtx {
  userId: string | null;
  organizationId: string | null;
  role: OrgRole | null;
  /** Membership de quien aprueba — el job nace auto-asignado a quien lo aprueba, mismo
   *  criterio que `crearBusqueda`. */
  membershipId: string | null;
}

export interface AprobarRequisitionDeps {
  getRequisitionStatus(
    requisitionId: string,
    organizationId: string,
  ): Promise<{ id: string; status: string } | null>;
  // Crea el job en draft a partir de la solicitud y marca la requisition como aprobada,
  // en una sola transacción: no queremos una solicitud aprobada sin su job.
  approveAndCreateJob(args: {
    requisitionId: string;
    organizationId: string;
    reviewedBy: string;
    assignedTo: string;
    reviewNote: string | null;
  }): Promise<{ jobId: string }>;
}

export async function aprobarRequisition(
  input: AprobarRequisitionInput,
  ctx: AprobarRequisitionCtx,
  deps: AprobarRequisitionDeps,
): Promise<Result<{ jobId: string }>> {
  if (!ctx.userId || !ctx.organizationId || !ctx.role || !ctx.membershipId) {
    return err("Necesitás estar autenticado en un workspace.");
  }
  if (!canReviewRequisitions(ctx.role)) {
    return err("No tenés permisos para revisar solicitudes.");
  }

  const requisition = await deps.getRequisitionStatus(input.requisitionId, ctx.organizationId);
  if (!requisition) {
    return err("Solicitud no encontrada.");
  }
  if (requisition.status !== "pending") {
    return err("Esta solicitud ya fue revisada.");
  }

  const reviewNote = input.reviewNote?.trim() || null;
  if (reviewNote && reviewNote.length > 2000) {
    return err("El comentario no puede superar los 2.000 caracteres.");
  }

  const { jobId } = await deps.approveAndCreateJob({
    requisitionId: input.requisitionId,
    organizationId: ctx.organizationId,
    reviewedBy: ctx.userId,
    assignedTo: ctx.membershipId,
    reviewNote,
  });

  return ok({ jobId });
}
