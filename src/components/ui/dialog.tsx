"use client";

import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

const subscribeNoop = () => () => {};

/** Tiempo que se mantiene el `<dialog>` abierto tras `open=false` para que el panel y el
 *  backdrop terminen su animación de salida antes de `close()`. Espeja `--motion-base`
 *  (sheet) con un margen — y el keyframe `pop-out`/`sheet-out` de globals.css. */
const DIALOG_EXIT_MS = 200;

interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** `center` = modal clásico; `right` = panel lateral (sheet). Default sheet. */
  side?: "center" | "right";
  /** Título accesible; se renderiza en el header si `header` no se pasa. */
  title?: string;
  /** Header custom (reemplaza el título por defecto). */
  header?: ReactNode;
  /** aria-label del `<dialog>` cuando el contenido no trae su propia barra de header visible
   *  (ej. un header propio dentro de `children`, como el del Copiloto IA). Default: `title`. */
  ariaLabel?: string;
  children: ReactNode;
  /** Ancho del sheet / max-width del modal. */
  className?: string;
  /** Override del max-width del `<dialog>` exterior en modo `center` (ej. "max-w-3xl") — el
   *  `className` de arriba solo llega al wrapper interior, no alcanza para ensanchar el modal
   *  más allá del `max-w-lg` por defecto. No aplica al sheet lateral. */
  maxWidthClassName?: string;
  /** Difumina lo que hay detrás del backdrop — para procesos que exigen atención (ej. el
   *  progreso de un lote). Opt-in: los modales normales no lo llevan. */
  blurBackdrop?: boolean;
  /** `false` = el modal no se puede cerrar (sin "✕", sin Esc, sin click en backdrop). Para
   *  una operación en curso que no se debe interrumpir. Default `true`. */
  dismissable?: boolean;
}

/**
 * Overlay sobre `<dialog>` nativo: foco atrapado, Esc para cerrar y render en el top layer
 * (escapa cualquier `overflow:hidden` — guía impeccable). Preferimos el sheet lateral al
 * modal centrado (PRODUCT.md: el modal es último recurso; el sheet conserva el contexto).
 */
export function Dialog({
  open,
  onClose,
  side = "right",
  title,
  header,
  ariaLabel,
  children,
  className = "",
  maxWidthClassName,
  blurBackdrop = false,
  dismissable = true,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  // `closing` = el panel está animando su salida: el <dialog> sigue abierto (con las clases
  // `*-out`) hasta que el timeout final llama a `close()`. `programmaticClose` distingue ese
  // `close()` nuestro del que dispararía un `<form method="dialog">`.
  const [closing, setClosing] = useState(false);
  const programmaticClose = useRef(false);
  // Portal a `document.body`: si el `<dialog>` quedara anidado dentro de un `Menu` (popover
  // nativo con "cualquier click adentro cierra el popover"), cerrar ese popover le mete
  // `display:none` a un ancestro justo cuando `showModal()` lo promueve a top layer — la
  // página queda inerte con un modal invisible. El portal saca al `<dialog>` de cualquier
  // ancestro ajeno, sea un popover, un `overflow:hidden` o un stacking context propio.
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  // Sincroniza el estado React con la API imperativa de <dialog>. Abrir es inmediato; cerrar
  // corre la animación de salida y recién después llama a `close()` (DIALOG_EXIT_MS). Los
  // `setState` van en callbacks de `setTimeout`, no en el cuerpo del efecto (regla de hooks).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
      const id = window.setTimeout(() => setClosing(false), 0);
      return () => window.clearTimeout(id);
    }
    if (!el.open) return;
    const enter = window.setTimeout(() => setClosing(true), 0);
    const finish = window.setTimeout(() => {
      setClosing(false);
      programmaticClose.current = true;
      if (ref.current?.open) ref.current.close();
    }, DIALOG_EXIT_MS);
    return () => {
      window.clearTimeout(enter);
      window.clearTimeout(finish);
    };
    // `mounted` entra en las deps: si `open` ya era `true` en el primer render (antes de que
    // el portal montara el `<dialog>` real), este efecto tiene que re-correr apenas monta para
    // no perderse el `showModal()`.
  }, [open, mounted]);

  // Esc dispara `cancel`: lo interceptamos siempre para que el cierre pase por el flujo de
  // `open` (con animación), no por el cierre instantáneo del navegador. `close` solo llega
  // por `<form method="dialog">` o por nuestro propio `close()` (que ignoramos vía ref).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      if (dismissable) onClose();
    };
    const handleClose = () => {
      if (programmaticClose.current) {
        programmaticClose.current = false;
        return;
      }
      if (!dismissable && open) {
        el.showModal();
        return;
      }
      onClose();
    };
    el.addEventListener("cancel", handleCancel);
    el.addEventListener("close", handleClose);
    return () => {
      el.removeEventListener("cancel", handleCancel);
      el.removeEventListener("close", handleClose);
    };
  }, [onClose, dismissable, open]);

  const isSheet = side === "right";

  if (!mounted) return null;

  return createPortal(
    <dialog
      ref={ref}
      aria-label={ariaLabel ?? title}
      // Click en el backdrop (fuera del panel) cierra, salvo modal no cerrable o ya cerrándose.
      onClick={(e) => {
        if (dismissable && !closing && e.target === ref.current) onClose();
      }}
      className={[
        "bg-transparent p-0 text-text backdrop:bg-[rgba(15,10,26,0.45)]",
        closing ? "backdrop:animate-fade-out" : "backdrop:animate-fade-in",
        blurBackdrop ? "backdrop:backdrop-blur-sm" : "",
        isSheet
          ? "m-0 ml-auto h-dvh max-h-dvh w-full max-w-[440px]"
          : `m-auto w-[calc(100%-2rem)] ${maxWidthClassName ?? "max-w-lg"} rounded-[var(--radius)]`,
      ].join(" ")}
    >
      <div
        className={[
          "flex flex-col bg-surface shadow-[var(--shadow-overlay)]",
          isSheet
            ? `h-dvh border-l border-border ${closing ? "animate-sheet-out" : "animate-sheet-in"}`
            : `max-h-[85dvh] rounded-[var(--radius)] border border-border ${closing ? "animate-pop-out" : "animate-pop-in"}`,
          className,
        ].join(" ")}
      >
        {(header || title) && (
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4">
            {header ?? (
              <h2 className="font-display text-base font-bold text-text">
                {title}
              </h2>
            )}
            {dismissable && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-bg hover:text-text"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="m4 4 8 8M12 4l-8 8" />
                </svg>
              </button>
            )}
          </header>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </dialog>,
    document.body,
  );
}
