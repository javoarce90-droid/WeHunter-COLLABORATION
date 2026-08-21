import type { OrgPatch } from "../data/settings.mutations";
export type { OrgRole } from "@/lib/auth/session";
import type { OrgRole } from "@/lib/auth/session";

/** Solo el owner o un admin pueden editar los datos del workspace. */
function canEditWorkspace(role: OrgRole): boolean {
  return role === "owner" || role === "admin";
}

export type EditarIdentidadWorkspaceInput = {
  name: string;
};

export type WorkspaceContext = { organizationId: string; role: OrgRole };

export type EditarIdentidadWorkspaceDeps = {
  updateOrganization: (organizationId: string, patch: OrgPatch) => Promise<void>;
};

/**
 * Caso de uso: editar el nombre del workspace. El logo se edita desde Career Site
 * (`features/recruiter/career-site`), que es el único formulario que lo toca — antes se
 * podía editar acá también, quedaba duplicado entre dos pantallas.
 * Autorización primaria acá (owner/admin) + RLS de respaldo (org_admin_can_update).
 */
export async function editarIdentidadWorkspace(
  input: EditarIdentidadWorkspaceInput,
  ctx: WorkspaceContext,
  deps: EditarIdentidadWorkspaceDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!canEditWorkspace(ctx.role)) {
    return { ok: false, error: "Solo el owner o un admin pueden editar el workspace." };
  }

  const name = input.name.trim();
  if (name.length === 0) {
    return { ok: false, error: "El nombre del workspace es obligatorio." };
  }

  const patch: OrgPatch = { name };
  await deps.updateOrganization(ctx.organizationId, patch);
  return { ok: true };
}
