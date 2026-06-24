import { ok, err, type Result } from "@/lib/result";
import { canManageRecruiting } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";

/** Caso de uso: crear una empresa cliente. Autorización primaria: rol + organization. */

export interface CrearClienteInput {
  name: string;
  contactName?: string | null;
  contactEmail?: string | null;
  notes?: string | null;
}

export interface CrearClienteCtx {
  userId: string | null;
  organizationId: string | null;
  role: OrgRole | null;
}

export interface CrearClienteDeps {
  insertClient(args: {
    organizationId: string;
    name: string;
    contactName: string | null;
    contactEmail: string | null;
    notes: string | null;
    createdBy: string;
  }): Promise<{ clientId: string }>;
}

export async function crearCliente(
  input: CrearClienteInput,
  ctx: CrearClienteCtx,
  deps: CrearClienteDeps,
): Promise<Result<{ clientId: string }>> {
  if (!ctx.userId || !ctx.organizationId || !ctx.role) {
    return err("Necesitás estar autenticado en un workspace.");
  }
  if (!canManageRecruiting(ctx.role)) {
    return err("No tenés permisos para gestionar clientes.");
  }

  const name = input.name.trim();
  if (name.length < 2) {
    return err("El nombre del cliente es demasiado corto.");
  }

  const { clientId } = await deps.insertClient({
    organizationId: ctx.organizationId,
    name,
    contactName: input.contactName?.trim() || null,
    contactEmail: input.contactEmail?.trim() || null,
    notes: input.notes?.trim() || null,
    createdBy: ctx.userId,
  });

  return ok({ clientId });
}
