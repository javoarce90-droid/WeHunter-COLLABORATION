import { ok, err, type Result } from "@/lib/result";

/**
 * Caso de uso: descartar el tour de bienvenida del recruiter (por "Saltear" o por llegar al
 * último paso). Es por membership, no por organization: cada miembro tiene su propio estado.
 */

export interface DescartarTourCtx {
  userId: string | null;
  organizationId: string | null;
}

export interface DescartarTourDeps {
  dismissOnboardingTour(profileId: string, organizationId: string): Promise<void>;
}

export async function descartarTour(
  ctx: DescartarTourCtx,
  deps: DescartarTourDeps,
): Promise<Result<null>> {
  if (!ctx.userId || !ctx.organizationId) {
    return err("Necesitás estar autenticado en un workspace para descartar el tour.");
  }

  await deps.dismissOnboardingTour(ctx.userId, ctx.organizationId);
  return ok(null);
}
