import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { subscriptions, subscriptionPayments, type Subscription, type SubscriptionPayment } from "@/db/schema";

/** Lecturas de la suscripción del workspace. Cliente RLS. */

/** La suscripción del workspace (1:1 con la org), o null si nunca se conectó dLocal Go. */
export async function getSubscriptionByOrg(
  organizationId: string,
): Promise<Subscription | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.organizationId, organizationId))
        .limit(1),
    "db.subscription",
  );
  return rows[0] ?? null;
}

/** `dlocal_payment_id` ya registrados para la org (idempotencia al reconciliar). */
export async function getRecordedPaymentIds(organizationId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({ id: subscriptionPayments.dlocalPaymentId })
        .from(subscriptionPayments)
        .where(eq(subscriptionPayments.organizationId, organizationId)),
    "db.subscription.payment-ids",
  );
  return rows.map((r) => r.id);
}

/** Historial de cobros del workspace, más reciente primero — para `/settings/plan`. */
export async function listSubscriptionPayments(
  organizationId: string,
  limit = 24,
): Promise<SubscriptionPayment[]> {
  const db = await getDb();
  return db.rls(
    (tx) =>
      tx
        .select()
        .from(subscriptionPayments)
        .where(eq(subscriptionPayments.organizationId, organizationId))
        .orderBy(desc(subscriptionPayments.paidAt))
        .limit(limit),
    "db.subscription.payments",
  );
}
