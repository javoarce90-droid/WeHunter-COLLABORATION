"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { iniciarSuscripcion } from "./domain/iniciar-suscripcion";
import { cambiarPlan } from "./domain/cambiar-plan";
import {
  ensurePendingSubscription,
  markSubscriptionCancelled,
  applyPlanChange,
} from "./data/subscriptions.mutations";
import { getSubscriptionByOrg } from "./data/subscriptions.queries";
import {
  getActivePlans,
  getPlanById,
  getPlanForWorkspaceType,
} from "./data/plans.queries";

export interface BillingActionState {
  error?: string;
}

/** Resuelve el plan vigente del workspace: el de la suscripción si existe, si no el que
 *  mapea al tipo de workspace. */
async function resolvePlan(organizationId: string, workspaceType: Parameters<typeof getPlanForWorkspaceType>[0]) {
  const subscription = await getSubscriptionByOrg(organizationId);
  return subscription?.planId
    ? getPlanById(subscription.planId)
    : getPlanForWorkspaceType(workspaceType);
}

/**
 * Conectar dLocal Go. En caso OK redirige al checkout hosteado (no vuelve estado al cliente).
 * Si algo falla, devuelve el error para el toast.
 */
export async function iniciarSuscripcionAction(): Promise<BillingActionState> {
  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!membership) return { error: "No pudimos identificar tu workspace." };

  const plan = await resolvePlan(membership.organizationId, membership.workspaceType);

  const result = await iniciarSuscripcion(
    {
      organizationId: membership.organizationId,
      role: membership.role,
      userEmail: user?.email ?? null,
    },
    { plan, ensurePendingSubscription },
  );

  if (!result.ok) return { error: result.error };

  redirect(result.data.checkoutUrl);
}

/** Da de baja la suscripción. El acceso se mantiene hasta el fin del período ya pago. */
export async function cancelarSuscripcionAction(): Promise<BillingActionState> {
  const membership = await getActiveMembership();
  if (!membership) return { error: "No pudimos identificar tu workspace." };
  if (!(membership.role === "owner" || membership.role === "admin")) {
    return { error: "Tu rol no administra la facturación del workspace." };
  }

  // TODO(Fase 4): avisarle también a dLocal Go (cancel subscription) antes de marcar local.
  await markSubscriptionCancelled(membership.organizationId);
  revalidatePath("/settings/plan");
  return {};
}

/** Cambiar de plan (hoy solo upgrade Freelancer → Teams). */
export async function cambiarPlanAction(targetPlanCode: string): Promise<BillingActionState> {
  const membership = await getActiveMembership();
  if (!membership) return { error: "No pudimos identificar tu workspace." };

  const result = await cambiarPlan(
    { targetPlanCode },
    {
      organizationId: membership.organizationId,
      role: membership.role,
      currentWorkspaceType: membership.workspaceType,
    },
    { getActivePlans, applyPlanChange },
  );

  if (!result.ok) return { error: result.error };

  // TODO(Fase 4): si hay suscripción cobrando en dLocal, pedirle el cambio de plan (prorrateo).
  revalidatePath("/settings/plan");
  revalidatePath("/dashboard");
  return {};
}
