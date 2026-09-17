/**
 * Caso de uso: decidir si corresponde mostrar el aviso de saldo bajo de créditos de Sourcing
 * (`limitar-sourcing-ia/design.md` §11, spec.md "Aviso de saldo bajo"). Umbral configurable,
 * default 10% de `activeCreditBudget` — escala solo entre Freelancer y Teams sin fijar un
 * número distinto a mano por plan.
 */
export const DEFAULT_LOW_BALANCE_THRESHOLD_RATIO = 0.1;

export function debeAvisarSaldoBajo(
  availableBalance: number,
  activeCreditBudget: number,
  thresholdRatio: number = DEFAULT_LOW_BALANCE_THRESHOLD_RATIO,
): boolean {
  if (activeCreditBudget <= 0) return false; // sin budget (trial agotado, org legado) — nada que avisar de más
  return availableBalance <= activeCreditBudget * thresholdRatio;
}
