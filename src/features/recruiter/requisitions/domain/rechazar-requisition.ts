import { ok, err, type Result } from "@/lib/result";
import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";

/**
 * Caso de uso: el recruiter rechaza una solicitud del cliente (§17 backlog).
 * El motivo es obligatorio: es lo único que el cliente ve como respuesta en su portal.
 */

export interface RechazarRequisitionInput {
  requisitionId: string;
  reviewNote: string;
}

export interface RechazarRequisitionCtx {
  userId: string | null;
  organizationId: string | null;
  role: OrgRole | null;
}

export interface RechazarRequisitionDeps {
  getRequisitionStatus(
    requisitionId: string,
    organizationId: string,
  ): Promise<{ id: string; status: string } | null>;
  rejectRequisition(args: {
    requisitionId: string;
    organizationId: string;
    reviewedBy: string;
    reviewNote: string;
  }): Promise<{ updated: boolean }>;
}

export async function rechazarRequisition(
  input: RechazarRequisitionInput,
  ctx: RechazarRequisitionCtx,
  deps: RechazarRequisitionDeps,
): Promise<Result<null>> {
  if (!ctx.userId || !ctx.organizationId || !ctx.role) {
    return err("Necesitás estar autenticado en un workspace.");
  }
  if (!can(ctx.role, "requisitions.review")) {
    return err("No tenés permisos para revisar solicitudes.");
  }

  const reviewNote = input.reviewNote.trim();
  if (reviewNote.length < 3) {
    return err("Contale al cliente por qué rechazás la solicitud.");
  }
  if (reviewNote.length > 2000) {
    return err("El comentario no puede superar los 2.000 caracteres.");
  }

  const requisition = await deps.getRequisitionStatus(input.requisitionId, ctx.organizationId);
  if (!requisition) {
    return err("Solicitud no encontrada.");
  }
  if (requisition.status !== "pending") {
    return err("Esta solicitud ya fue revisada.");
  }

  await deps.rejectRequisition({
    requisitionId: input.requisitionId,
    organizationId: ctx.organizationId,
    reviewedBy: ctx.userId,
    reviewNote,
  });

  return ok(null);
}
