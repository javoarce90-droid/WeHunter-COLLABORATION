import { eq } from "drizzle-orm";
import { admin } from "@/db/client";
import {
  subscriptions,
  subscriptionPayments,
  plans,
  sourcingCreditBalances,
  type Subscription,
} from "@/db/schema";
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
 *  aunque el webhook reintente. Cuando el cobro es realmente nuevo (no un reintento), la misma
 *  transacción renueva los créditos de Sourcing del ciclo (`limitar-sourcing-ia/design.md` §4)
 *  — ver `renewSourcingCreditsOnNewPayment`. */
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
      const inserted = await tx
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
        .onConflictDoNothing({ target: subscriptionPayments.dlocalPaymentId })
        .returning({ id: subscriptionPayments.id });

      // `inserted.length === 0` = el webhook reintentó un cobro ya registrado — no es una
      // renovación nueva, no se tocan los créditos (evita resetear el saldo dos veces).
      if (inserted.length > 0) {
        await renewSourcingCreditsOnNewPayment(tx, {
          organizationId: args.organizationId,
          currentPeriodEndsAt: args.patch.currentPeriodEndsAt ?? null,
        });
      }
    }
  });
}

/**
 * Renueva `sourcing_credit_balances` cuando se confirma un cobro nuevo de verdad (no un
 * reintento del webhook) — `limitar-sourcing-ia/design.md` §4. Lee `plans.credit_budget` del
 * plan VIGENTE en este momento (no uno pasado como argumento — un cambio de plan a mitad de
 * ciclo ya actualizó `subscriptions.plan_id` de inmediato vía `applyPlanChange`, pero
 * `active_credit_budget` recién se congela acá, en la próxima renovación real — design.md §5).
 * `onConflictDoUpdate` en vez de un `UPDATE` liso: defensivo ante una organización que todavía
 * no tenga fila de saldo (no debería pasar en producción — se siembra al crear la org, ver
 * tasks.md grupo 6 — pero autocura en vez de perder la renovación en silencio).
 */
async function renewSourcingCreditsOnNewPayment(
  tx: Parameters<Parameters<typeof admin.transaction>[0]>[0],
  args: { organizationId: string; currentPeriodEndsAt: Date | null },
): Promise<void> {
  const sub = await tx
    .select({ planId: subscriptions.planId })
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, args.organizationId))
    .limit(1);
  const planId = sub[0]?.planId;
  if (!planId) return; // fila legado sin plan asignado — nada que renovar

  const plan = await tx
    .select({ creditBudget: plans.creditBudget })
    .from(plans)
    .where(eq(plans.id, planId))
    .limit(1);
  const creditBudget = plan[0]?.creditBudget ?? 0;

  await tx
    .insert(sourcingCreditBalances)
    .values({
      organizationId: args.organizationId,
      includedBalance: creditBudget,
      purchasedBalance: 0,
      activeCreditBudget: creditBudget,
      cycleEndsAt: args.currentPeriodEndsAt,
      lowBalanceNotifiedAt: null,
    })
    .onConflictDoUpdate({
      target: sourcingCreditBalances.organizationId,
      set: {
        includedBalance: creditBudget,
        activeCreditBudget: creditBudget,
        cycleEndsAt: args.currentPeriodEndsAt,
        lowBalanceNotifiedAt: null,
        updatedAt: new Date(),
      },
    });
}
