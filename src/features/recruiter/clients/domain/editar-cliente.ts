import { ok, err, type Result } from "@/lib/result";
import { canManageRecruiting } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";

/** Caso de uso: editar los datos de una empresa cliente existente. */

export interface EditarClienteInput {
  clientId: string;
  name: string;
  contactName?: string | null;
  contactEmail?: string | null;
  notes?: string | null;
}

export interface EditarClienteCtx {
  organizationId: string | null;
  role: OrgRole | null;
}

export interface EditarClienteDeps {
  updateClientFields(
    clientId: string,
    organizationId: string,
    fields: {
      name: string;
      contactName: string | null;
      contactEmail: string | null;
      notes: string | null;
    },
  ): Promise<{ updated: boolean }>;
}

export async function editarCliente(
  input: EditarClienteInput,
  ctx: EditarClienteCtx,
  deps: EditarClienteDeps,
): Promise<Result<{ clientId: string }>> {
  if (!ctx.organizationId || !ctx.role) {
    return err("Necesitás estar autenticado en un workspace.");
  }
  if (!canManageRecruiting(ctx.role)) {
    return err("No tenés permisos para gestionar clientes.");
  }

  const name = input.name.trim();
  if (name.length < 2) {
    return err("El nombre del cliente es demasiado corto.");
  }

  const { updated } = await deps.updateClientFields(input.clientId, ctx.organizationId, {
    name,
    contactName: input.contactName?.trim() || null,
    contactEmail: input.contactEmail?.trim() || null,
    notes: input.notes?.trim() || null,
  });
  if (!updated) {
    return err("El cliente no existe.");
  }

  return ok({ clientId: input.clientId });
}
