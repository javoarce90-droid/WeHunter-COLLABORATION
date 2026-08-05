import { ok, err, type Result } from "@/lib/result";
import { can, isAssignmentScoped } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";

/**
 * Caso de uso: registrar que se copió el link público de una búsqueda. El contador
 * (`jobs.share_count`) es informativo — no hay "deshacer", cada copia suma.
 */

export interface RegistrarCompartidaBusquedaCtx {
  organizationId: string | null;
  role: OrgRole | null;
  /** Roles acotados por asignación (ver `isAssignmentScoped`) solo la propia. */
  membershipId: string | null;
}

export interface RegistrarCompartidaBusquedaDeps {
  incrementShareCount(
    jobId: string,
    organizationId: string,
    scopeToMembershipId?: string,
  ): Promise<void>;
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

  const scope = isAssignmentScoped(ctx.role) ? (ctx.membershipId ?? undefined) : undefined;
  await deps.incrementShareCount(input.jobId, ctx.organizationId, scope);
  return ok(undefined);
}
