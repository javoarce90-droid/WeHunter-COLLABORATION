import { ok, err, type Result } from "@/lib/result";
import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";

/**
 * Caso de uso: asignar (o desasignar, con `membershipId: null`) el recruiter exclusivo de
 * un cliente. Alcance simple: un cliente tiene un solo recruiter a la vez — asignar uno
 * nuevo limpia cualquier otro membership que tuviera ese mismo `clientId` (mismo criterio
 * que un responsable único de recurso).
 */

export interface AsignarRecruiterAClienteInput {
  clientId: string;
  membershipId: string | null;
}

export interface AsignarRecruiterAClienteCtx {
  organizationId: string | null;
  role: OrgRole | null;
}

export interface AsignarRecruiterAClienteDeps {
  getClientById(clientId: string, organizationId: string): Promise<{ id: string } | null>;
  getMembershipById(
    membershipId: string,
    organizationId: string,
  ): Promise<{ id: string } | null>;
  assignRecruiterToClient(
    organizationId: string,
    clientId: string,
    membershipId: string | null,
  ): Promise<void>;
}

export async function asignarRecruiterACliente(
  input: AsignarRecruiterAClienteInput,
  ctx: AsignarRecruiterAClienteCtx,
  deps: AsignarRecruiterAClienteDeps,
): Promise<Result<void>> {
  if (!ctx.organizationId || !ctx.role) {
    return err("Necesitás estar autenticado en un workspace.");
  }
  if (!can(ctx.role, "clients.manage")) {
    return err("No tenés permisos para gestionar clientes.");
  }

  const client = await deps.getClientById(input.clientId, ctx.organizationId);
  if (!client) {
    return err("Cliente no encontrado.");
  }

  if (input.membershipId) {
    const membership = await deps.getMembershipById(input.membershipId, ctx.organizationId);
    if (!membership) {
      return err("El recruiter no pertenece a este workspace.");
    }
  }

  await deps.assignRecruiterToClient(ctx.organizationId, input.clientId, input.membershipId);
  return ok(undefined);
}
