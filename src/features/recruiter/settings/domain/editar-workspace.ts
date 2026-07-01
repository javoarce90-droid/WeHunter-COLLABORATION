import type { OrgPatch, CareerSiteBranding } from "../data/settings.mutations";

export type OrgRole = "owner" | "admin" | "recruiter" | "consultant";

/** Solo el owner o un admin pueden editar los datos del workspace. */
function canEditWorkspace(role: OrgRole): boolean {
  return role === "owner" || role === "admin";
}

export type EditarWorkspaceInput = {
  name: string;
  careerSiteEnabled: boolean;
  branding: CareerSiteBranding;
  logoPath?: string | null; // path ya subido a Storage; null = sin cambio gestionado aparte
  coverPath?: string | null; // idem, portada del Career Site
};

export type WorkspaceContext = { organizationId: string; role: OrgRole };

export type EditarWorkspaceDeps = {
  updateOrganization: (organizationId: string, patch: OrgPatch) => Promise<void>;
};

/**
 * Caso de uso: editar el workspace y su Career Site (nombre, logo, portada, publicación y
 * branding). Es una única config: el Career Site es la cara pública de ese mismo workspace.
 * Autorización primaria acá (owner/admin) + RLS de respaldo (org_admin_can_update).
 */
export async function editarWorkspace(
  input: EditarWorkspaceInput,
  ctx: WorkspaceContext,
  deps: EditarWorkspaceDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!canEditWorkspace(ctx.role)) {
    return { ok: false, error: "Solo el owner o un admin pueden editar el workspace." };
  }

  const name = input.name.trim();
  if (name.length === 0) {
    return { ok: false, error: "El nombre del workspace es obligatorio." };
  }

  const patch: OrgPatch = {
    name,
    careerSiteEnabled: input.careerSiteEnabled,
    careerSiteSettings: input.branding,
  };
  // Logo y portada: solo se tocan si vino un path nuevo (la subida se resuelve en la action).
  if (input.logoPath) patch.logoUrl = input.logoPath;
  if (input.coverPath) patch.careerSiteCoverUrl = input.coverPath;

  await deps.updateOrganization(ctx.organizationId, patch);
  return { ok: true };
}
