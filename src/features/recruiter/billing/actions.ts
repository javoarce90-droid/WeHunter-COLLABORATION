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
import { getDlocalSubscribeUrl, getDlocalPlanToken } from "./data/dlocal-go.config";
import {
  resolvePlanIdByToken,
  deactivateSubscription,
  changeSubscriberPlan,
} from "./data/dlocal-go.client";
import { ok, err, type Result } from "@/lib/result";
import type { Subscription } from "@/db/schema";

export interface BillingActionState {
  error?: string;
}

/** `planId` + `subscriptionId` numéricos de dLocal para una suscripción ya conectada. null
 *  cuando todavía no se conectó (nunca cargó tarjeta) → no hay nada que sincronizar. */
async function dlocalRefs(
  subscription: Subscription,
  planCode: string,
): Promise<Result<{ planId: number; subscriptionId: number } | null>> {
  if (!subscription.dlocalSubscriptionId) return ok(null);
  const token = getDlocalPlanToken(planCode);
  if (!token) return err(`Falta DLOCALGO_PLAN_TOKEN_${planCode.toUpperCase()}.`);
  const planId = await resolvePlanIdByToken(token);
  if (!planId.ok) return planId;
  return ok({ planId: planId.data, subscriptionId: Number(subscription.dlocalSubscriptionId) });
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
    {
      plan: plan ? { id: plan.id } : null,
      subscribeUrl: plan ? getDlocalSubscribeUrl(plan.code) : null,
      ensurePendingSubscription,
    },
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

  const subscription = await getSubscriptionByOrg(membership.organizationId);
  const plan = subscription?.planId ? await getPlanById(subscription.planId) : null;

  if (subscription && plan) {
    const refs = await dlocalRefs(subscription, plan.code);
    if (!refs.ok) return { error: refs.error };
    if (refs.data) {
      const res = await deactivateSubscription(refs.data.planId, refs.data.subscriptionId);
      if (!res.ok) return { error: `No pudimos dar de baja en dLocal Go: ${res.error}` };
    }
  }

  await markSubscriptionCancelled(membership.organizationId);
  revalidatePath("/settings/plan");
  return {};
}

/** Cambiar de plan (hoy solo upgrade Freelancer → Teams). */
export async function cambiarPlanAction(targetPlanCode: string): Promise<BillingActionState> {
  const membership = await getActiveMembership();
  if (!membership) return { error: "No pudimos identificar tu workspace." };

  const subscription = await getSubscriptionByOrg(membership.organizationId);
  const currentPlan = subscription?.planId
    ? await getPlanById(subscription.planId)
    : await getPlanForWorkspaceType(membership.workspaceType);

  const result = await cambiarPlan(
    { targetPlanCode },
    {
      organizationId: membership.organizationId,
      role: membership.role,
      currentPlanId: currentPlan?.id ?? null,
    },
    {
      getActivePlans,
      applyPlanChange,
      // Si ya hay suscripción cobrando en dLocal, movemos el plan allá primero (prorrateo lo
      // hace dLocal). Si falla, el dominio corta y no se toca nada local.
      syncPlanChangeWithProvider:
        subscription && currentPlan
          ? async ({ targetPlanId }) => {
              const refs = await dlocalRefs(subscription, currentPlan.code);
              if (!refs.ok) return err(refs.error);
              if (!refs.data) return ok(undefined);

              const targetPlan = await getPlanById(targetPlanId);
              const targetToken = targetPlan && getDlocalPlanToken(targetPlan.code);
              if (!targetPlan || !targetToken) return err("Falta el token del plan destino.");

              const targetPlanIdNum = await resolvePlanIdByToken(targetToken);
              if (!targetPlanIdNum.ok) return err(targetPlanIdNum.error);

              const res = await changeSubscriberPlan(
                refs.data.planId,
                refs.data.subscriptionId,
                targetPlanIdNum.data,
              );
              return res.ok ? ok(undefined) : err(`dLocal Go: ${res.error}`);
            }
          : undefined,
    },
  );

  if (!result.ok) return { error: result.error };

  revalidatePath("/settings/plan");
  revalidatePath("/dashboard");
  return {};
}
