import { consumeSourcingCredit } from "../../sourcing-credits/data/sourcing-credit-balances.mutations";
import { insertSourcingCreditEvent } from "../../sourcing-credits/data/sourcing-credit-events.mutations";
import { sourcingCreditsEnabled } from "../../sourcing-credits/domain/sourcing-credits-enabled";

/**
 * Evento de consumo de Sourcing externo, hacia la capa de consumo genérica de
 * `limitar-sourcing-ia`. Descuenta crédito (vía `consumeSourcingCredit`,
 * `sourcing-credits/data/sourcing-credit-balances.mutations.ts`) para `NEW_PROFILE`/
 * `DUPLICATE` y deja un registro de auditoría (`sourcing_credit_events`) siempre — el tipo y la
 * firma vienen de `integrar-harvestapi-sourcing/design.md` §7, el cuerpo real lo agrega
 * `limitar-sourcing-ia/design.md` §8.
 */
export type SourcingConsumptionEventType =
  | "NEW_PROFILE"
  | "REUSED_PROFILE"
  | "DUPLICATE"
  | "PROFILE_REFRESH"
  | "FAILED";

/** `NEW_PROFILE`/`DUPLICATE` cobran 1 crédito cada uno — un duplicado del Talent Pool NO se
 *  exime (spec.md "Duplicados contra el Talent Pool — siempre consumen crédito"). */
export function shouldChargeCredit(type: SourcingConsumptionEventType): boolean {
  return type === "NEW_PROFILE" || type === "DUPLICATE";
}

export type SourcingConsumptionEvent = {
  organizationId: string;
  jobId: string;
  userId: string | null;
  /** linkedinUrl normalizada del candidato, o `"(search)"` para un evento a nivel búsqueda
   *  (ej. `FAILED` cuando la búsqueda entera falló antes de devolver candidatos). */
  candidateKey: string;
  type: SourcingConsumptionEventType;
  costUsd: number;
  provider: string;
  occurredAt: Date;
};

/**
 * Registra el consumo real: descuenta 1 crédito cuando `shouldChargeCredit(event.type)` y deja
 * el evento de auditoría siempre, cobrado o no. Si `consumeSourcingCredit` devuelve `ok: false`
 * (saldo insuficiente bajo una carrera de concurrencia — design.md §6, edge case aceptado), el
 * evento igual se audita, con `creditsCharged: 0` — el proveedor ya fue pagado externamente en
 * ese caso, no hay forma de "deshacer" esa llamada.
 */
export async function recordSourcingConsumption(
  event: SourcingConsumptionEvent,
): Promise<void> {
  let creditsCharged = 0;
  let creditSource: "included" | "purchased" | null = null;

  // Interruptor de reversión (design.md §12): en `false` no se descuenta saldo, pero el
  // registro de auditoría de abajo sigue corriendo igual.
  if (sourcingCreditsEnabled() && shouldChargeCredit(event.type)) {
    const result = await consumeSourcingCredit(event.organizationId);
    if (result.ok) {
      creditsCharged = 1;
      creditSource = result.source;
    }
  }

  await insertSourcingCreditEvent({ ...event, creditsCharged, creditSource });
}
