/**
 * Caso de uso: decidir si una solicitud de Sourcing externo puede ejecutarse dado el saldo
 * disponible, y a cuántos candidatos hay que acotarla (`limitar-sourcing-ia/design.md` §7,
 * spec.md "Saldo insuficiente"). El pedido se acota al saldo disponible ANTES de llamar al
 * proveedor — nunca se ejecuta de más y se recorta después.
 */
export type EvaluarSolicitudSourcingResult =
  | { ok: true; maxResults: number }
  | { ok: false; available: 0 };

export function evaluarSolicitudSourcing(
  requestedMaxResults: number,
  availableBalance: number,
): EvaluarSolicitudSourcingResult {
  if (availableBalance <= 0) return { ok: false, available: 0 };
  return { ok: true, maxResults: Math.min(requestedMaxResults, availableBalance) };
}
