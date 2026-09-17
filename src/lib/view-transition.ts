import { flushSync } from "react-dom";

/**
 * Envuelve una mutación del DOM en una View Transition del navegador para que los cambios de
 * layout (una fila que se va de un listado, un reordenamiento) se animen con continuidad en
 * vez de saltar. Degrada limpio: sin soporte de la API o con `prefers-reduced-motion`, aplica
 * el cambio al instante.
 */
export function startViewTransition(mutate: () => void): void {
  if (
    typeof document === "undefined" ||
    typeof document.startViewTransition !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    mutate();
    return;
  }
  document.startViewTransition(mutate);
}

/**
 * Igual que `startViewTransition` pero para cambios de estado de React: fuerza el commit
 * síncrono con `flushSync` para que el navegador capture el DOM ya actualizado dentro de la
 * transición. Usar solo desde event handlers.
 */
export function withViewTransition(updateState: () => void): void {
  startViewTransition(() => flushSync(updateState));
}
