import { eq } from "drizzle-orm";
import { admin } from "@/db/client";
import { subscriptions, subscriptionPayments, type Subscription } from "@/db/schema";
import type {
  PaymentToRecord,
  SubscriptionPatch,
} from "../domain/reconciliar-suscripcion";

/**
 * Escrituras del webhook de dLocal Go (`/api/webhooks/dlocal`). No hay sesión de usuario, así
 * que van por el cliente `admin` (bypassa RLS) — es una tarea de sistema, la autenticidad la
 * garantiza la firma HMAC del webhook (`verifyDlocalSignature`). Las escrituras equivalentes
 * disparadas por el usuario viven en `subscriptions.mutations.ts` y usan el cliente RLS.
 */

/** La suscripción de una org, sin pasar por RLS. Para resolver el plan desde el webhook. */
export async function getSubscriptionByOrgAsSystem(
  organizationId: string,
): Promise<Subscription | null> {
  const rows = await admin
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId))
    .limit(1);
  return rows[0] ?? null;
}

/** `dlocal_payment_id` ya registrados para la org (idempotencia de cobros). */
export async function getRecordedPaymentIdsAsSystem(
  organizationId: string,
): Promise<string[]> {
  const rows = await admin
    .select({ id: subscriptionPayments.dlocalPaymentId })
    .from(subscriptionPayments)
    .where(eq(subscriptionPayments.organizationId, organizationId));
  return rows.map((r) => r.id);
}

/** Aplica el resultado de `reconciliarSuscripcion`: actualiza la suscripción y, si hay, inserta
 *  el cobro. Una transacción. `onConflictDoNothing` sobre `dlocal_payment_id` = idempotente
 *  aunque el webhook reintente. */
export async function applyReconcileAsSystem(args: {
  subscriptionId: string;
  organizationId: string;
  patch: SubscriptionPatch;
  payment: PaymentToRecord | null;
}): Promise<void> {
  await admin.transaction(async (tx) => {
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
  });
}
