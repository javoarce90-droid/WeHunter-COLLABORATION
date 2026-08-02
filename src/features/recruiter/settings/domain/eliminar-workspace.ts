import type { OrgRole } from "@/lib/auth/session";

/**
 * Caso de uso: eliminar el workspace por completo. Solo el owner (no admin — demasiado
 * destructivo para delegar). El escrito del nombre exacto es una guarda de UX contra clicks
 * accidentales; la autorización real es este chequeo de rol + la RLS de respaldo
 * (org_owner_can_delete). La cascada FK sobre organization_id se encarga del resto de las
 * tablas de dominio, no hay borrado manual que orquestar acá.
 */

export type EliminarWorkspaceInput = { confirmName: string };

export type EliminarWorkspaceContext = {
  organizationId: string;
  organizationName: string;
  role: OrgRole;
};

export type EliminarWorkspaceDeps = {
  deleteOrganization: (organizationId: string) => Promise<void>;
};

export async function eliminarWorkspace(
  input: EliminarWorkspaceInput,
  ctx: EliminarWorkspaceContext,
  deps: EliminarWorkspaceDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (ctx.role !== "owner") {
    return { ok: false, error: "Solo el propietario puede eliminar el workspace." };
  }

  if (input.confirmName.trim() !== ctx.organizationName.trim()) {
    return { ok: false, error: "El nombre no coincide. Escribilo exactamente para confirmar." };
  }

  await deps.deleteOrganization(ctx.organizationId);
  return { ok: true };
}
