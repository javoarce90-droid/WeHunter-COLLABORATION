/**
 * Interruptor de reversión a nivel plataforma (`limitar-sourcing-ia/design.md` §12,
 * spec.md "Interruptor de reversión"). En `false`, el saldo de Sourcing es efectivamente
 * infinito — no se bloquea ni se descuenta crédito — pero los controles internos (auditoría,
 * aviso de Talent Pool) siguen activos. Default `true`: los créditos operan normalmente salvo
 * que se apague explícitamente.
 */
export function sourcingCreditsEnabled(): boolean {
  return process.env.SOURCING_CREDITS_ENABLED !== "false";
}
