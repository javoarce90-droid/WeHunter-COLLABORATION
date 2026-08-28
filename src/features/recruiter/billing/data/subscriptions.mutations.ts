import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { organizations, subscriptions, subscriptionPayments } from "@/db/schema";
import type { WorkspaceType } from "@/lib/auth/session";
import type {
  PaymentToRecord,
  SubscriptionPatch,
} from "../domain/reconciliar-suscripcion";

/** Escrituras disparadas por el usuario. Cliente RLS. Las del webhook de dLocal (sin sesión)
 *  viven aparte y usan el cliente admin (ver Fase 4). */

/**
 * Deja registrada la intención de suscribirse: una fila `pending` para la org. Idempotente —
 * si ya existe una suscripción (en cualquier estado), no la toca.
 */
export async function ensurePendingSubscription(args: {
  organizationId: string;
  planId: string;
}): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .insert(subscriptions)
        .values({
          organizationId: args.organizationId,
          planId: args.planId,
          status: "pending",
        })
        .onConflictDoNothing({ target: subscriptions.organizationId }),
    "db.subscription.ensure-pending",
  );
}

/**
 * Aplica el resultado de `reconciliarSuscripcion` desde la vuelta del checkout (hay sesión →
 * cliente RLS). Misma lógica que `applyReconcileAsSystem` (webhook, cliente admin). El
 * `onConflictDoNothing` sobre `dlocal_payment_id` evita duplicar el cobro si el webhook llegó
 * primero.
 */
export async function applyReconcile(args: {
  subscriptionId: string;
  organizationId: string;
  patch: SubscriptionPatch;
  payment: PaymentToRecord | null;
}): Promise<void> {
  const db = await getDb();
  await db.rls(async (tx) => {
    await tx
      .update(subscriptions)
      .set({
        dlocalSubscriptionId: args.patch.dlocalSubscriptionId,
        dlocalSubscriptionToken: args.patch.dlocalSubscriptionToken,
        dlocalPayerEmail: args.patch.dlocalPayerEmail,
        status: args.patch.status,
        ...(args.patch.currentPeriodEndsAt
          ? { currentPeriodEndsAt: args.patch.currentPeriodEndsAt }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.organizationId, args.organizationId));

    if (args.payment) {
      await tx
        .insert(subscriptionPayments)
        .values({
          organizationId: args.organizationId,
          subscriptionId: args.subscriptionId,
          dlocalPaymentId: args.payment.dlocalPaymentId,
          amount: args.payment.amount,
          currency: args.payment.currency,
          status: "PAID",
          paidAt: args.payment.paidAt,
        })
        .onConflictDoNothing({ target: subscriptionPayments.dlocalPaymentId });
    }
  }, "db.subscription.reconcile");
}

/** Marca la suscripción como dada de baja. El acceso se mantiene hasta `current_period_ends_at`. */
export async function markSubscriptionCancelled(organizationId: string): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(subscriptions)
        .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
        .where(eq(subscriptions.organizationId, organizationId)),
    "db.subscription.cancel",
  );
}

/**
 * Aplica un cambio de plan: el tipo de workspace de la org + el `plan_id` de la suscripción
 * (si hay fila). Una sola transacción RLS. RLS `org_admin_can_update` respalda que solo
 * owner/admin de esa org puedan tocar `organizations`.
 */
export async function applyPlanChange(args: {
  organizationId: string;
  targetPlanId: string;
  targetWorkspaceType: WorkspaceType;
}): Promise<void> {
  const db = await getDb();
  await db.rls(async (tx) => {
    await tx
      .update(organizations)
      .set({ workspaceType: args.targetWorkspaceType, updatedAt: new Date() })
      .where(eq(organizations.id, args.organizationId));
    await tx
      .update(subscriptions)
      .set({ planId: args.targetPlanId, updatedAt: new Date() })
      .where(eq(subscriptions.organizationId, args.organizationId));
  }, "db.subscription.change-plan");
}
