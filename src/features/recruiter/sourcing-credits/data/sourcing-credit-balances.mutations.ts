import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";

export type ConsumeSourcingCreditResult =
  | { ok: true; source: "included" | "purchased" }
  | { ok: false };

/**
 * Descuenta 1 crédito de Sourcing externo de una organización, atómicamente, sin ir nunca a
 * negativo bajo concurrencia (`limitar-sourcing-ia/design.md` §6, spec.md "Concurrencia en
 * Teams"). Descuenta primero de `included_balance` (spec.md "Orden de consumo — incluidos
 * primero"); recién al llegar a 0 empieza a descontar de `purchased_balance`.
 *
 * Una sola sentencia (CTE `before` + `UPDATE ... FROM before ... RETURNING`): el locking de fila
 * de Postgres sobre esa sentencia da la atomicidad — no hay un SELECT separado antes del UPDATE
 * (eso sí tendría una carrera entre leer y escribir). `before` captura el `included_balance`
 * ANTES del descuento para poder informar de qué saldo salió el crédito, ya que `RETURNING` de
 * un `UPDATE` solo ve los valores post-escritura de las columnas de la propia tabla.
 *
 * 0 filas devueltas = saldo insuficiente (`ok: false`) — el caller nunca debe asumir que esto
 * "no puede pasar" solo porque hubo un chequeo previo (`getAvailableSourcingBalance`): ese
 * chequeo es optimista, esta es la única garantía dura (ver el edge case de concurrencia
 * documentado en design.md §6).
 */
export async function consumeSourcingCredit(
  organizationId: string,
): Promise<ConsumeSourcingCreditResult> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx.execute(sql`
        WITH before AS (
          SELECT included_balance
          FROM sourcing_credit_balances
          WHERE organization_id = ${organizationId}
          FOR UPDATE
        )
        UPDATE sourcing_credit_balances
        SET included_balance = GREATEST(sourcing_credit_balances.included_balance - 1, 0),
            purchased_balance = sourcing_credit_balances.purchased_balance
              - GREATEST(1 - sourcing_credit_balances.included_balance, 0),
            updated_at = now()
        FROM before
        WHERE sourcing_credit_balances.organization_id = ${organizationId}
          AND (sourcing_credit_balances.included_balance
               + sourcing_credit_balances.purchased_balance) >= 1
        RETURNING (before.included_balance > 0) AS from_included
      `),
    "db.sourcing-credit-balance.consume",
  );

  const row = rows[0] as { from_included: boolean } | undefined;
  if (!row) return { ok: false };
  return { ok: true, source: row.from_included ? "included" : "purchased" };
}
