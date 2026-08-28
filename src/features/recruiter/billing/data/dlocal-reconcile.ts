import { ok, err, type Result } from "@/lib/result";
import { getDlocalPlanToken } from "./dlocal-go.config";
import {
  listSubscriptions,
  listExecutions,
  resolvePlanIdByToken,
  type DlocalExecution,
} from "./dlocal-go.client";
import type { DlocalRemoteState } from "../domain/reconciliar-suscripcion";

/**
 * Arma el `DlocalRemoteState` que consume `reconciliarSuscripcion`, hablando con la API de
 * dLocal Go. Dos formas de descubrir la suscripción:
 *  - por `subscriptionId` (webhook: lo trae el payload).
 *  - por `clientEmail` (vuelta del checkout: solo tenemos la org y el email del recruiter).
 * Devuelve `null` cuando dLocal todavía no tiene la suscripción (la vuelta muestra "procesando").
 */

function toRemote(exec: DlocalExecution | null, subFallback: DlocalExecution["subscription"]): DlocalRemoteState {
  const sub = exec?.subscription ?? subFallback;
  return {
    subscriptionId: sub.id,
    subscriptionToken: sub.subscription_token,
    active: sub.active,
    clientEmail: sub.client_email,
    scheduledDate: sub.scheduled_date,
    latestExecution: exec
      ? {
          orderId: exec.order_id,
          status: exec.status,
          amountReceived: exec.amount_received,
          balanceCurrency: exec.balance_currency,
          createdAt: exec.created_at,
        }
      : null,
  };
}

/** La ejecución más reciente por `created_at` (dLocal no garantiza orden). */
function newest(execs: DlocalExecution[]): DlocalExecution | null {
  return execs.reduce<DlocalExecution | null>((acc, e) => {
    if (!acc) return e;
    return (e.created_at ?? "") > (acc.created_at ?? "") ? e : acc;
  }, null);
}

export async function fetchDlocalRemoteState(
  planCode: string,
  by: { subscriptionId: number } | { clientEmail: string },
): Promise<Result<DlocalRemoteState | null>> {
  const planToken = getDlocalPlanToken(planCode);
  if (!planToken) return err(`Falta DLOCALGO_PLAN_TOKEN_${planCode.toUpperCase()}.`);

  const planId = await resolvePlanIdByToken(planToken);
  if (!planId.ok) return planId;

  if ("subscriptionId" in by) {
    const execs = await listExecutions(planId.data, by.subscriptionId);
    if (!execs.ok) return execs;
    const exec = newest(execs.data.data);
    if (!exec) return ok(null);
    return ok(toRemote(exec, exec.subscription));
  }

  // Descubrir por email: la suscripción activa más reciente del recruiter en este plan.
  const target = by.clientEmail.toLowerCase();
  for (let page = 1; ; page++) {
    const subs = await listSubscriptions(planId.data, page);
    if (!subs.ok) return subs;

    const mine = subs.data.data
      .filter((s) => s.active && (s.client_email ?? "").toLowerCase() === target)
      .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));

    if (mine[0]) {
      const execs = await listExecutions(planId.data, mine[0].id);
      if (!execs.ok) return execs;
      return ok(toRemote(newest(execs.data.data), mine[0]));
    }
    if (page >= subs.data.total_pages) return ok(null);
  }
}
