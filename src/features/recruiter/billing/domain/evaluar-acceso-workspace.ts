import type { SubscriptionStatus } from "@/db/schema";

/**
 * Caso de uso: decidir si un workspace puede usar la app, está en período de prueba, o
 * quedó bloqueado por falta de pago. Función pura y única fuente de verdad del gate de
 * acceso (lo consume `getWorkspaceAccess()` en `src/lib/auth/session.ts`, que a su vez
 * gobierna el shell del reclutador).
 *
 * Modelo (decisión de producto 2026-08-27, ver el plan de dLocal Go):
 *  - La prueba de 14 días arranca con `organizations.created_at`, exista o no la fila de
 *    `subscriptions`. Durante la prueba el acceso es completo.
 *  - Al conectar dLocal Go se crea la suscripción en `trialing` con la tarjeta ya cargada;
 *    dLocal informa `trial_ends_at` (fecha del primer cobro).
 *  - Terminada la prueba sin suscripción activa → `blocked`.
 *  - Suscripción `active` con el período vigente (+ gracia) → `ok`.
 *  - `past_due` / período vencido → `blocked`. `cancelled` mantiene el acceso hasta fin de
 *    período.
 */

/** Días de prueba por defecto (cada plan trae los suyos en `plans.trial_days`; hoy los dos
 *  planes usan 14). Sirve de fallback cuando no hay plan resuelto. */
export const TRIAL_DAYS = 14;
/** Días de gracia después de `current_period_ends_at` antes de cortar (reintentos de dLocal). */
export const GRACE_DAYS = 3;
/** Margen tras el fin de prueba para que llegue el webhook del primer cobro antes de cortar. */
export const FIRST_CHARGE_MARGIN_DAYS = 2;

const DAY_MS = 24 * 60 * 60 * 1000;

export type WorkspaceAccessState = "trial" | "ok" | "blocked";

export type WorkspaceAccessReason =
  | "trialing" // dentro de los 14 días
  | "active" // suscripción paga al día
  | "cancelled_active" // dada de baja, con período todavía vigente
  | "awaiting_first_charge" // terminó la prueba, dLocal aún no confirmó el primer cobro
  | "trial_expired" // pasaron los 14 días y nunca se conectó dLocal Go
  | "payment_overdue" // un cobro falló o venció el período pago
  | "subscription_cancelled"; // dada de baja y ya venció el período

export interface WorkspaceAccess {
  state: WorkspaceAccessState;
  reason: WorkspaceAccessReason;
  /** Días completos hasta el corte cuando `state === "trial"`. 0 en cualquier otro caso. */
  daysLeft: number;
  /** dLocal Go ya tiene una tarjeta cargada para este workspace. */
  hasPaymentMethod: boolean;
}

export interface SubscriptionSnapshot {
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEndsAt: Date | null;
}

export interface EvaluarAccesoWorkspaceInput {
  orgCreatedAt: Date;
  /** Días de prueba del plan del workspace (`plans.trial_days`). */
  trialDays: number;
  subscription: SubscriptionSnapshot | null;
  now: Date;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** Días completos que faltan desde `now` hasta `end` (siempre ≥ 1 mientras `end > now`). */
function daysUntil(now: Date, end: Date): number {
  return Math.max(1, Math.ceil((end.getTime() - now.getTime()) / DAY_MS));
}

/** La suscripción tiene tarjeta cargada en dLocal (cualquier estado menos el inicial). */
function hasCard(status: SubscriptionStatus): boolean {
  return status !== "pending";
}

export function evaluarAccesoWorkspace({
  orgCreatedAt,
  trialDays,
  subscription,
  now,
}: EvaluarAccesoWorkspaceInput): WorkspaceAccess {
  const derivedTrialEnd = addDays(orgCreatedAt, trialDays);
  const cardOnFile = subscription ? hasCard(subscription.status) : false;

  // Sin suscripción, o creada pero sin tarjeta: vale la ventana derivada de la creación.
  if (!subscription || subscription.status === "pending") {
    if (now < derivedTrialEnd) {
      return {
        state: "trial",
        reason: "trialing",
        daysLeft: daysUntil(now, derivedTrialEnd),
        hasPaymentMethod: cardOnFile,
      };
    }
    return {
      state: "blocked",
      reason: "trial_expired",
      daysLeft: 0,
      hasPaymentMethod: cardOnFile,
    };
  }

  switch (subscription.status) {
    case "trialing": {
      const trialEnd = subscription.trialEndsAt ?? derivedTrialEnd;
      if (now < trialEnd) {
        return {
          state: "trial",
          reason: "trialing",
          daysLeft: daysUntil(now, trialEnd),
          hasPaymentMethod: true,
        };
      }
      // Prueba terminada: le damos unos días a dLocal para confirmar el primer cobro.
      const blocked = now >= addDays(trialEnd, FIRST_CHARGE_MARGIN_DAYS);
      return {
        state: blocked ? "blocked" : "ok",
        reason: blocked ? "payment_overdue" : "awaiting_first_charge",
        daysLeft: 0,
        hasPaymentMethod: true,
      };
    }

    case "active": {
      const periodEnd = subscription.currentPeriodEndsAt;
      const withinPeriod = !periodEnd || now < addDays(periodEnd, GRACE_DAYS);
      return {
        state: withinPeriod ? "ok" : "blocked",
        reason: withinPeriod ? "active" : "payment_overdue",
        daysLeft: 0,
        hasPaymentMethod: true,
      };
    }

    case "past_due": {
      const periodEnd = subscription.currentPeriodEndsAt;
      const withinGrace = !!periodEnd && now < addDays(periodEnd, GRACE_DAYS);
      return {
        state: withinGrace ? "ok" : "blocked",
        reason: "payment_overdue",
        daysLeft: 0,
        hasPaymentMethod: true,
      };
    }

    case "cancelled": {
      const periodEnd = subscription.currentPeriodEndsAt;
      const stillActive = !!periodEnd && now < periodEnd;
      return {
        state: stillActive ? "ok" : "blocked",
        reason: stillActive ? "cancelled_active" : "subscription_cancelled",
        daysLeft: 0,
        hasPaymentMethod: true,
      };
    }
  }
}
