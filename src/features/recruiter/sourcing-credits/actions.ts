"use server";

import { getActiveMembership } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { getSourcingCreditsSnapshot } from "./data/sourcing-credit-balances.queries";
import { sourcingCreditsEnabled } from "./domain/sourcing-credits-enabled";
import { debeAvisarSaldoBajo } from "./domain/evaluar-saldo-bajo";

/**
 * Lectura del saldo de créditos de Sourcing para la pantalla (indicador + aviso de saldo bajo,
 * `limitar-sourcing-ia/design.md` §11). Interruptor de reversión (§12): en deshabilitado
 * devuelve un saldo "infinito" que nunca bloquea ni avisa — la UI se comporta como si el
 * sistema de créditos no existiera.
 */
export async function getSourcingCreditsBalanceAction(): Promise<{
  ok: boolean;
  available?: number;
  included?: number;
  purchased?: number;
  activeCreditBudget?: number;
  lowBalance?: boolean;
  /** Días hasta el fin del ciclo actual, `null` si no hay fecha registrada — usado por el
   *  estado bloqueado por saldo 0 ("Renueva en N días"). */
  daysUntilRenewal?: number | null;
  enabled?: boolean;
  error?: string;
}> {
  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };
  if (!can(membership.role, "candidates.manage")) {
    return { ok: false, error: "Tu rol no permite usar sourcing." };
  }

  // Sin `available`/`lowBalance`: `enabled: false` alcanza para que la UI no muestre ningún
  // indicador ni límite (evita mandar `Infinity` a través del boundary de la server action).
  if (!sourcingCreditsEnabled()) {
    return { ok: true, enabled: false };
  }

  const snapshot = await getSourcingCreditsSnapshot(membership.organizationId);
  const daysUntilRenewal = snapshot.cycleEndsAt
    ? Math.max(0, Math.ceil((snapshot.cycleEndsAt.getTime() - Date.now()) / 86_400_000))
    : null;
  return {
    ok: true,
    available: snapshot.available,
    included: snapshot.included,
    purchased: snapshot.purchased,
    activeCreditBudget: snapshot.activeCreditBudget,
    lowBalance: debeAvisarSaldoBajo(snapshot.available, snapshot.activeCreditBudget),
    daysUntilRenewal,
    enabled: true,
  };
}
