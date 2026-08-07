/** `spinner-status` la excluye del apagado global de `prefers-reduced-motion` (globals.css):
 *  es un indicador de estado funcional, no decoración — congelarla no comunica nada, solo
 *  parece rota (ver forma del anillo: sin girar, es una "C" estática). */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={[
        "spinner-status inline-block h-[1em] w-[1em] shrink-0 animate-spin rounded-full align-[-0.125em]",
        "border-2 border-current border-r-transparent",
        className,
      ].join(" ")}
    />
  );
}
