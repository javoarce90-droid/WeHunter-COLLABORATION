"use client";

import {
  type ButtonHTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

interface MenuProps {
  /** Nodo del trigger (un botón/IconButton). El click lo abre/cierra. */
  trigger: ReactNode;
  children: ReactNode;
  /** Alineación horizontal del panel respecto del trigger. */
  align?: "start" | "end";
  className?: string;
}

/**
 * Menú desplegable sobre la **Popover API** nativa: render en el top layer (no lo clippea
 * ningún `overflow:hidden` de las columnas del pipeline — guía impeccable), light-dismiss y
 * Esc gratis. Posicionado con JS (fixed) respecto del trigger.
 */
export function Menu({ trigger, children, align = "end", className = "" }: MenuProps) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  function position() {
    const anchor = anchorRef.current;
    const pop = popoverRef.current;
    if (!anchor || !pop) return;
    const r = anchor.getBoundingClientRect();
    pop.style.top = `${Math.round(r.bottom + 4)}px`;
    const left = align === "end" ? r.right - pop.offsetWidth : r.left;
    // Clamp al viewport para no desbordar a la derecha.
    const clamped = Math.max(8, Math.min(left, window.innerWidth - pop.offsetWidth - 8));
    pop.style.left = `${Math.round(clamped)}px`;
  }

  function toggle() {
    const pop = popoverRef.current;
    if (!pop) return;
    pop.togglePopover();
  }

  // El evento `toggle` es la fuente de verdad del estado (cubre light-dismiss y Esc).
  useEffect(() => {
    const pop = popoverRef.current;
    if (!pop) return;
    const onToggle = (e: Event) => {
      const isOpen = (e as ToggleEvent).newState === "open";
      setOpen(isOpen);
      if (isOpen) position();
    };
    pop.addEventListener("toggle", onToggle);
    return () => pop.removeEventListener("toggle", onToggle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reposicionar mientras está abierto si cambia el scroll/resize.
  useEffect(() => {
    if (!open) return;
    const handler = () => position();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <span
        ref={anchorRef}
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex"
      >
        {trigger}
      </span>
      <div
        ref={popoverRef}
        popover="auto"
        role="menu"
        className={[
          "fixed m-0 min-w-44 rounded-[var(--radius)] border border-border bg-surface p-1",
          "shadow-[var(--shadow-overlay)] animate-pop-in",
          // El popover usa el top layer; fijamos el z por consistencia semántica.
          "z-[var(--z-dropdown)]",
          className,
        ].join(" ")}
        onClick={() => popoverRef.current?.hidePopover()}
      >
        {children}
      </div>
    </>
  );
}

interface MenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Tinte destructivo (descartar, eliminar). */
  destructive?: boolean;
  icon?: ReactNode;
}

export function MenuItem({
  destructive = false,
  icon,
  className = "",
  children,
  ...props
}: MenuItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={[
        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] font-medium transition-colors",
        "outline-none focus-visible:bg-bg disabled:opacity-50",
        destructive
          ? "text-danger hover:bg-danger/10"
          : "text-text hover:bg-bg",
        className,
      ].join(" ")}
      {...props}
    >
      {icon && <span className="grid h-4 w-4 shrink-0 place-items-center text-muted">{icon}</span>}
      {children}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-label">
      {children}
    </p>
  );
}

export function MenuSeparator() {
  return <div className="my-1 h-px bg-border" role="separator" />;
}
