/**
 * Evento de consumo de Sourcing externo, hacia la capa de consumo genérica que
 * `limitar-sourcing-ia` todavía no implementó en código (su `apply` no arrancó). Este archivo
 * es el seam de integración: `recordSourcingConsumption` es un no-op con log hasta que ese
 * change reemplace el cuerpo por el registro real — la forma (tipo + firma) no cambia,
 * solo el cuerpo (design.md §7 de `integrar-harvestapi-sourcing`).
 */
export type SourcingConsumptionEventType =
  | "NEW_PROFILE"
  | "REUSED_PROFILE"
  | "DUPLICATE"
  | "PROFILE_REFRESH"
  | "FAILED";

export type SourcingConsumptionEvent = {
  organizationId: string;
  jobId: string;
  /** linkedinUrl normalizada del candidato, o `"(search)"` para un evento a nivel búsqueda
   *  (ej. `FAILED` cuando la búsqueda entera falló antes de devolver candidatos). */
  candidateKey: string;
  type: SourcingConsumptionEventType;
  costUsd: number;
  occurredAt: Date;
};

/** No-op hasta que `limitar-sourcing-ia` implemente el registro real (créditos, saldo,
 *  auditoría). Loguea para no perder trazabilidad mientras tanto. */
export async function recordSourcingConsumption(
  event: SourcingConsumptionEvent,
): Promise<void> {
  console.info("[sourcing-consumption]", event);
}
