import {
  SlugTakenError,
  type OrgPatch,
  type CareerSiteBranding,
} from "@/features/recruiter/settings/data/settings.mutations";
import type { OrgRole } from "@/lib/auth/session";

/** Solo el owner o un admin pueden editar el Career Site. */
function canEditCareerSite(role: OrgRole): boolean {
  return role === "owner" || role === "admin";
}

export type EditarCareerSiteInput = {
  slug: string;
  branding: CareerSiteBranding;
  coverPath?: string | null; // path ya subido a Storage; null = sin cambio gestionado aparte
};

export type CareerSiteContext = { organizationId: string; role: OrgRole };

export type EditarCareerSiteDeps = {
  updateOrganization: (organizationId: string, patch: OrgPatch) => Promise<void>;
};

/**
 * Caso de uso: editar el Career Site del workspace (dirección/slug, portada y branding). Es
 * siempre público — no existe un estado "despublicado" (ver WorkspaceSection heredado).
 * Autorización primaria acá (owner/admin) + RLS de respaldo (org_admin_can_update).
 */
export async function editarCareerSite(
  input: EditarCareerSiteInput,
  ctx: CareerSiteContext,
  deps: EditarCareerSiteDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!canEditCareerSite(ctx.role)) {
    return { ok: false, error: "Solo el owner o un admin pueden editar el Career Site." };
  }

  const slug = input.slug.trim().toLowerCase();
  if (slug.length === 0) {
    return { ok: false, error: "El slug del Career Site es obligatorio." };
  }

  const patch: OrgPatch = { slug, careerSiteSettings: input.branding };
  // Portada: solo se toca si vino un path nuevo (la subida se resuelve en la action).
  if (input.coverPath) patch.careerSiteCoverUrl = input.coverPath;

  try {
    await deps.updateOrganization(ctx.organizationId, patch);
  } catch (e) {
    if (e instanceof SlugTakenError) {
      return { ok: false, error: "Ese slug ya está en uso por otro workspace. Probá con otro." };
    }
    throw e;
  }
  return { ok: true };
}
