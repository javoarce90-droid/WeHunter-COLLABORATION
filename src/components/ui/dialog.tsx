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
  children: ReactNode;
  /** Ancho del sheet / max-width del modal. */
  className?: string;
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
  children,
  className = "",
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  // Sincroniza el estado React con la API imperativa de <dialog>.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  // Esc/`cancel` y submit de form method=dialog disparan `close` → avisamos al padre.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handleClose = () => onClose();
    el.addEventListener("close", handleClose);
    return () => el.removeEventListener("close", handleClose);
  }, [onClose]);

  const isSheet = side === "right";

  return (
    <dialog
      ref={ref}
      aria-label={title}
      // Click en el backdrop (fuera del panel) cierra.
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={[
        "bg-transparent p-0 text-text backdrop:bg-[rgba(15,10,26,0.45)] backdrop:animate-fade-in",
        isSheet
          ? "m-0 ml-auto h-dvh max-h-dvh w-full max-w-[440px]"
          : "m-auto w-full max-w-lg rounded-[var(--radius)]",
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
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-3.5">
            {header ?? (
              <h2 className="font-display text-base font-bold text-text">{title}</h2>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-bg hover:text-text"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="m4 4 8 8M12 4l-8 8" />
              </svg>
            </button>
          </header>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </dialog>
  );
}
