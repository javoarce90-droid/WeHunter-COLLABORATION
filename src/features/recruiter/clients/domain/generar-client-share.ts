import { ok, err, type Result } from "@/lib/result";
import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";

/**
 * Caso de uso: generar el enlace de acceso de un Cliente sin cuenta (§17, camino Cliente).
 * A diferencia del share de shortlist, el token se ata al cliente y persiste entre
 * solicitudes: con él pide búsquedas y sigue el estado de las que ya pidió.
 */

export interface GenerarClientShareInput {
  clientId: string;
  // Días hasta el vencimiento del link. null = sin vencimiento.
  expiresInDays: number | null;
}

export interface GenerarClientShareCtx {
  userId: string | null;
  organizationId: string | null;
  role: OrgRole | null;
}

export interface GenerarClientShareDeps {
  getClientById(clientId: string, organizationId: string): Promise<{ id: string } | null>;
  generateToken(): string;
  createClientShare(args: {
    organizationId: string;
    clientId: string;
    token: string;
    expiresAt: Date | null;
    createdBy: string;
  }): Promise<{ shareId: string; token: string }>;
}

export async function generarClientShare(
  input: GenerarClientShareInput,
  ctx: GenerarClientShareCtx,
  deps: GenerarClientShareDeps,
): Promise<Result<{ shareId: string; token: string }>> {
  if (!ctx.userId || !ctx.organizationId || !ctx.role) {
    return err("Necesitás estar autenticado en un workspace.");
  }
  if (!can(ctx.role, "clients.manage")) {
    return err("No tenés permisos para generar enlaces de cliente.");
  }

  if (input.expiresInDays !== null && input.expiresInDays <= 0) {
    return err("El vencimiento debe ser de al menos un día.");
  }

  const client = await deps.getClientById(input.clientId, ctx.organizationId);
  if (!client) {
    return err("Cliente no encontrado.");
  }

  const expiresAt =
    input.expiresInDays === null
      ? null
      : new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000);

  const result = await deps.createClientShare({
    organizationId: ctx.organizationId,
    clientId: input.clientId,
    token: deps.generateToken(),
    expiresAt,
    createdBy: ctx.userId,
  });

  return ok(result);
}
