import type { OrgPatch } from "../data/settings.mutations";
export type { OrgRole } from "@/lib/auth/session";
import type { OrgRole } from "@/lib/auth/session";

/** Solo el owner o un admin pueden editar los datos del workspace. */
function canEditWorkspace(role: OrgRole): boolean {
  return role === "owner" || role === "admin";
}

export type EditarIdentidadWorkspaceInput = {
  name: string;
  logoPath?: string | null; // path ya subido a Storage; null = sin cambio gestionado aparte
};

export type WorkspaceContext = { organizationId: string; role: OrgRole };

export type EditarIdentidadWorkspaceDeps = {
  updateOrganization: (organizationId: string, patch: OrgPatch) => Promise<void>;
};

/**
 * Caso de uso: editar la identidad del workspace (nombre y logo). El Career Site (slug,
 * portada, branding) tiene su propio caso de uso en `features/recruiter/career-site` — son
 * dos pantallas y dos formularios distintos, aunque ambos escriben la misma fila de `organizations`.
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
  // Logo: solo se toca si vino un path nuevo (la subida se resuelve en la action).
  if (input.logoPath) patch.logoUrl = input.logoPath;

  await deps.updateOrganization(ctx.organizationId, patch);
  return { ok: true };
}
