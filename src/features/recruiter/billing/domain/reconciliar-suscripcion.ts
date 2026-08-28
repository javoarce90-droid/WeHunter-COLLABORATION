import type { SubscriptionStatus } from "@/db/schema";

/**
 * Caso de uso: reconciliar la suscripción local del workspace contra el estado real en
 * dLocal Go. Función pura — la usan tanto el webhook (`/api/webhooks/dlocal`) como la vuelta
 * del checkout (`/settings/plan/checkout/return`), que difieren solo en cómo descubren la
 * suscripción de dLocal y en qué cliente de base escriben.
 *
 * Modelo (ver el plan de dLocal Go, spike 2026-08-28):
 *  - Los cobros de suscripción son `executions`, no `payments`. Cada uno trae `order_id`
 *    (idempotencia), `status` y `amount_received` (USD, ya con fees).
 *  - `subscription.scheduled_date` = fecha del próximo cobro → `current_period_ends_at`.
 *  - `free_trial_days = 0`: al conectar la tarjeta el primer cobro es inmediato; la
 *    suscripción nace `active`. El período de prueba de 14 días es aparte (nuestro gate).
 */

export type DlocalExecutionStatus = "PENDING" | "COMPLETED" | "DECLINED";

export interface DlocalRemoteState {
  subscriptionId: number;
  subscriptionToken: string;
  /** `false` = el pagador dio de baja la suscripción del lado de dLocal. */
  active: boolean;
  clientEmail: string | null;
  /** Próximo cobro programado (ISO). */
  scheduledDate: string | null;
  /** Ejecución (cobro) más reciente. null = todavía no hay ninguna. */
  latestExecution: {
    /** `order_id` de dLocal — clave de idempotencia del cobro. */
    orderId: string;
    status: DlocalExecutionStatus;
    /** Monto que realmente entra a la cuenta (en `balanceCurrency`, normalmente USD). */
    amountReceived: number;
    balanceCurrency: string;
    createdAt: string | null;
  } | null;
}

export interface ReconciliarSuscripcionInput {
  /** Nuestra fila actual (la crea `iniciarSuscripcion` como `pending` antes del checkout). */
  local: { status: SubscriptionStatus };
  /** Estado en dLocal. null = la suscripción todavía no aparece del lado de dLocal. */
  remote: DlocalRemoteState | null;
  /** `dlocal_payment_id` ya registrados para esta org (idempotencia de cobros). */
  recordedPaymentIds: readonly string[];
  now: Date;
}

export interface SubscriptionPatch {
  dlocalSubscriptionId: string;
  dlocalSubscriptionToken: string;
  dlocalPayerEmail: string | null;
  status: SubscriptionStatus;
  /** `undefined` = no tocar la columna. */
  currentPeriodEndsAt?: Date;
}

export interface PaymentToRecord {
  dlocalPaymentId: string;
  /** `numeric` como string, 2 decimales. */
  amount: string;
  currency: string;
  paidAt: Date;
}

export interface ReconciliarSuscripcionOutput {
  /** `true` = el estado quedó resuelto (active / past_due / cancelled). `false` = seguimos
   *  esperando la confirmación del cobro (la vuelta del checkout muestra "procesando"). */
  settled: boolean;
  subscriptionPatch: SubscriptionPatch | null;
  paymentToRecord: PaymentToRecord | null;
}

function parseDate(iso: string | null): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function reconciliarSuscripcion({
  remote,
  recordedPaymentIds,
  now,
}: ReconciliarSuscripcionInput): ReconciliarSuscripcionOutput {
  if (!remote) {
    return { settled: false, subscriptionPatch: null, paymentToRecord: null };
  }

  const link = {
    dlocalSubscriptionId: String(remote.subscriptionId),
    dlocalSubscriptionToken: remote.subscriptionToken,
    dlocalPayerEmail: remote.clientEmail,
  };

  if (!remote.active) {
    return {
      settled: true,
      subscriptionPatch: {
        ...link,
        status: "cancelled",
        currentPeriodEndsAt: parseDate(remote.scheduledDate),
      },
      paymentToRecord: null,
    };
  }

  const exec = remote.latestExecution;

  if (!exec || exec.status === "PENDING") {
    return {
      settled: false,
      subscriptionPatch: { ...link, status: "pending" },
      paymentToRecord: null,
    };
  }

  if (exec.status === "DECLINED") {
    return {
      settled: true,
      subscriptionPatch: { ...link, status: "past_due" },
      paymentToRecord: null,
    };
  }

  // COMPLETED
  const alreadyRecorded = recordedPaymentIds.includes(exec.orderId);
  return {
    settled: true,
    subscriptionPatch: {
      ...link,
      status: "active",
      currentPeriodEndsAt: parseDate(remote.scheduledDate),
    },
    paymentToRecord: alreadyRecorded
      ? null
      : {
          dlocalPaymentId: exec.orderId,
          amount: exec.amountReceived.toFixed(2),
          currency: exec.balanceCurrency,
          paidAt: parseDate(exec.createdAt) ?? now,
        },
  };
}
