import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { sourcingCreditBalances } from "@/db/schema";

/**
 * Saldo disponible de créditos de Sourcing externo de una organización — `included_balance +
 * purchased_balance` (`limitar-sourcing-ia/design.md` §2.2, §7). Lectura optimista para el
 * pre-check antes de ejecutar (design.md §7): la garantía dura contra sobregiro es
 * `consumeSourcingCredit` (`sourcing-credit-balances.mutations.ts`), no esta lectura.
 *
 * 0 si la organización todavía no tiene fila — no debería pasar en producción (se siembra al
 * crear la org, ver tasks.md grupo 6), pero una lectura defensiva evita un error si falta.
 */
export async function getAvailableSourcingBalance(organizationId: string): Promise<number> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          included: sourcingCreditBalances.includedBalance,
          purchased: sourcingCreditBalances.purchasedBalance,
        })
        .from(sourcingCreditBalances)
        .where(eq(sourcingCreditBalances.organizationId, organizationId))
        .limit(1),
    "db.sourcing-credit-balance.available",
  );
  const row = rows[0];
  return row ? row.included + row.purchased : 0;
}

export type SourcingCreditsSnapshot = {
  available: number;
  /** Créditos incluidos del ciclo actual, todavía sin consumir (spec.md "Estructura de
   *  saldos — tres campos, no uno"). */
  included: number;
  /** Créditos comprados en packs, acumulables, no vencen. */
  purchased: number;
  activeCreditBudget: number;
  /** Fin del ciclo actual — espejo de `subscriptions.current_period_ends_at` al último reset
   *  (solo informativo, ver comentario en el schema). Se usa para el "Renueva en N días" del
   *  estado bloqueado por saldo 0. */
  cycleEndsAt: Date | null;
};

/**
 * Saldo desglosado (incluidos/comprados/budget) en una sola query (no varias) — lo que la UI
 * necesita para mostrar el indicador de créditos, decidir el aviso de saldo bajo
 * (`debeAvisarSaldoBajo`, `sourcing-credits/domain/evaluar-saldo-bajo.ts`) y el desglose visible
 * en el chip del topbar / Configuración → Plan, sin una transacción extra por pantalla
 * (`database.md` — "una transacción, no N").
 */
export async function getSourcingCreditsSnapshot(
  organizationId: string,
): Promise<SourcingCreditsSnapshot> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          included: sourcingCreditBalances.includedBalance,
          purchased: sourcingCreditBalances.purchasedBalance,
          activeCreditBudget: sourcingCreditBalances.activeCreditBudget,
          cycleEndsAt: sourcingCreditBalances.cycleEndsAt,
        })
        .from(sourcingCreditBalances)
        .where(eq(sourcingCreditBalances.organizationId, organizationId))
        .limit(1),
    "db.sourcing-credit-balance.snapshot",
  );
  const row = rows[0];
  if (!row) {
    return { available: 0, included: 0, purchased: 0, activeCreditBudget: 0, cycleEndsAt: null };
  }
  return {
    available: row.included + row.purchased,
    included: row.included,
    purchased: row.purchased,
    activeCreditBudget: row.activeCreditBudget,
    cycleEndsAt: row.cycleEndsAt,
  };
}
