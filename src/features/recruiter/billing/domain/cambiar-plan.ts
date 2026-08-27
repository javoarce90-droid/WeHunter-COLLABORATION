import type { Plan } from "@/db/schema";
import type { OrgRole, WorkspaceType } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { ok, err, type Result } from "@/lib/result";

/**
 * Caso de uso: pasar el workspace a otro plan (hoy solo upgrade Freelancer → Teams).
 * Cambia el tipo de workspace de la org y, si ya hay suscripción, su `plan_id`. Avisarle
 * a dLocal Go del cambio de plan cuando hay una suscripción cobrando es Fase 4.
 *
 * El downgrade (Teams → Freelancer) no está soportado todavía: hay que resolver qué pasa si
 * el equipo tiene más de un miembro y el prorrateo del cobro.
 */

export interface CambiarPlanInput {
  targetPlanCode: string;
}

export interface CambiarPlanCtx {
  organizationId: string;
  role: OrgRole;
  currentWorkspaceType: WorkspaceType | null;
}

export interface CambiarPlanDeps {
  getActivePlans: () => Promise<Plan[]>;
  /** Cambia `organizations.workspace_type` + `subscriptions.plan_id` (si hay fila). */
  applyPlanChange: (args: {
    organizationId: string;
    targetPlanId: string;
    targetWorkspaceType: WorkspaceType;
  }) => Promise<void>;
}

export async function cambiarPlan(
  input: CambiarPlanInput,
  ctx: CambiarPlanCtx,
  deps: CambiarPlanDeps,
): Promise<Result<{ planName: string }>> {
  if (!can(ctx.role, "billing.view")) {
    return err("Tu rol no administra la facturación del workspace.");
  }

  const plans = await deps.getActivePlans();
  const target = plans.find((p) => p.code === input.targetPlanCode);
  if (!target) return err("Ese plan no está disponible.");

  const current = plans.find((p) => p.workspaceType === ctx.currentWorkspaceType) ?? null;
  if (current && current.id === target.id) {
    return err("Ya estás en ese plan.");
  }
  if (current && target.sortOrder <= current.sortOrder) {
    return err("Por ahora solo se puede pasar a un plan superior.");
  }

  await deps.applyPlanChange({
    organizationId: ctx.organizationId,
    targetPlanId: target.id,
    targetWorkspaceType: target.workspaceType,
  });

  return ok({ planName: target.name });
}
