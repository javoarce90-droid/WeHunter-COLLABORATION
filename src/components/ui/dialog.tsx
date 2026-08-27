"use client";

import { type ReactNode, useEffect, useRef } from "react";

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

  // Sincroniza el estado React con la API imperativa de <dialog>.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  // Esc/`cancel` y submit de form method=dialog disparan `close` → avisamos al padre (salvo
  // que el modal no sea cerrable: ahí lo reabrimos para bloquear el Esc del navegador).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleCancel = (e: Event) => {
      if (!dismissable) {
        e.preventDefault();
        return;
      }
    };
    const handleClose = () => {
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

  return (
    <dialog
      ref={ref}
      aria-label={ariaLabel ?? title}
      // Click en el backdrop (fuera del panel) cierra, salvo modal no cerrable.
      onClick={(e) => {
        if (dismissable && e.target === ref.current) onClose();
      }}
      className={[
        "bg-transparent p-0 text-text backdrop:bg-[rgba(15,10,26,0.45)] backdrop:animate-fade-in",
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
            ? "h-dvh animate-sheet-in border-l border-border"
            : "max-h-[85dvh] animate-pop-in rounded-[var(--radius)] border border-border",
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
    </dialog>
  );
}
