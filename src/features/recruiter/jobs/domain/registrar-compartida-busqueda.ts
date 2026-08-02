import { ok, err, type Result } from "@/lib/result";
import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";

/**
 * Caso de uso: registrar que se copió el link público de una búsqueda. El contador
 * (`jobs.share_count`) es informativo — no hay "deshacer", cada copia suma.
 */

export interface RegistrarCompartidaBusquedaCtx {
  organizationId: string | null;
  role: OrgRole | null;
}

export interface RegistrarCompartidaBusquedaDeps {
  incrementShareCount(jobId: string, organizationId: string): Promise<void>;
}

export async function registrarCompartidaBusqueda(
  input: { jobId: string },
  ctx: RegistrarCompartidaBusquedaCtx,
  deps: RegistrarCompartidaBusquedaDeps,
): Promise<Result<void>> {
  if (!ctx.organizationId || !ctx.role) {
    return err("Necesitás estar autenticado en un workspace.");
  }
  if (!can(ctx.role, "jobs.manage")) {
    return err("No tenés permisos para gestionar búsquedas.");
  }

  await deps.incrementShareCount(input.jobId, ctx.organizationId);
  return ok(undefined);
}
