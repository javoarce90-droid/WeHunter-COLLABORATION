import { cache } from "react";
import type { Plan } from "@/db/schema";
import { getActiveMembership } from "@/lib/auth/session";
import {
  evaluarAccesoWorkspace,
  TRIAL_DAYS,
  type WorkspaceAccess,
} from "../domain/evaluar-acceso-workspace";
import { getSubscriptionByOrg } from "./subscriptions.queries";
import { getPlanById, getPlanForWorkspaceType } from "./plans.queries";

/**
 * Estado de acceso del workspace activo (prueba / al día / bloqueado) + el plan que le
 * corresponde. Gobierna el shell del reclutador (`src/app/(app)/layout.tsx`) y alimenta la
 * UI de facturación con nombre y precio del plan.
 *
 * `cache()` por request — el layout lo pide y alguna page podría volver a pedirlo, pero las
 * transacciones RLS corren una sola vez.
 */
export type WorkspaceAccessResult = WorkspaceAccess & {
  organizationId: string;
  /** Plan del workspace: el de la suscripción si existe, si no el que mapea al tipo de
   *  workspace. null en orgs enterprise o legado sin tipo. */
  plan: Plan | null;
};

export const getWorkspaceAccess = cache(
  async (): Promise<WorkspaceAccessResult | null> => {
    const membership = await getActiveMembership();
    if (!membership) return null;

    const subscription = await getSubscriptionByOrg(membership.organizationId);

    const plan = subscription?.planId
      ? await getPlanById(subscription.planId)
      : await getPlanForWorkspaceType(membership.workspaceType);

    const access = evaluarAccesoWorkspace({
      orgCreatedAt: membership.organizationCreatedAt,
      trialDays: plan?.trialDays ?? TRIAL_DAYS,
      subscription: subscription
        ? {
            status: subscription.status,
            trialEndsAt: subscription.trialEndsAt,
            currentPeriodEndsAt: subscription.currentPeriodEndsAt,
          }
        : null,
      now: new Date(),
    });

    return { ...access, organizationId: membership.organizationId, plan };
  },
);
