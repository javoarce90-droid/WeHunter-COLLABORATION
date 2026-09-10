/** Subconjunto de `SyntheticEvent` que hace falta — evita atarse al parámetro de tipo Element
 *  (`MouseEvent<HTMLElement>` vs. `MouseEvent<Element>`) de cada handler que lo llama. */
interface BubblingEvent {
  target: EventTarget | null;
  currentTarget: EventTarget | null;
}

/**
 * Selector de "esto ya maneja su propia interacción": si un evento nace acá adentro, un
 * contenedor clickeable que lo envuelve (una fila, una card) no debe reaccionar también.
 * Incluye `dialog` a propósito — `Dialog` (`src/components/ui/dialog.tsx`) no usa portal, así
 * que un diálogo abierto queda anidado en el DOM de la fila que lo contiene, y cualquier tecla
 * tipeada adentro (Enter, Espacio, un número) burbujea igual hasta ella.
 */
const INTERACTIVE_SELECTOR =
  "a, button, input, textarea, select, dialog, [role='button'], [role='menuitem'], [role='dialog'], [contenteditable='true']";

/**
 * Filas/cards con `role="button"` + `onClick`/`onKeyDown` propios (ver `InterviewRow` en
 * AgendaView, `PipelineCard`) suelen contener a la vez controles reales — links, botones, un
 * diálogo con inputs. Sin este chequeo, activar uno de esos controles (o tipear adentro de un
 * diálogo ya abierto) burbujea y dispara TAMBIÉN la acción del contenedor.
 *
 * En vez de cortar la propagación a mano en cada control nuevo que se agregue adentro (frágil:
 * alcanza con olvidarse uno para que vuelva el bug — así se coló el reportado en Agenda), el
 * contenedor se pregunta una sola vez, en su propio handler: "¿el evento nació en algo que ya
 * se maneja solo?". Cubre cualquier control presente o futuro sin tocarlo.
 */
export function isFromInteractiveDescendant(e: BubblingEvent): boolean {
  const target = e.target as HTMLElement | null;
  if (!target || target === e.currentTarget) return false;
  const closest = target.closest(INTERACTIVE_SELECTOR);
  // Si lo más cercano que matchea es el propio contenedor (ej. la fila también tiene
  // `role="button"`), no hay ningún control adentro entre el target y la fila: no es esto.
  return closest !== null && closest !== e.currentTarget;
}
