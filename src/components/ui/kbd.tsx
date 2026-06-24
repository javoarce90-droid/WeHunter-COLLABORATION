import type { HTMLAttributes } from "react";

/**
 * Tecla/atajo. Para mostrar accelerators (⌘K, Esc, 1–6) — recognition rather than recall.
 */
export function Kbd({ className = "", children, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={[
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-bg px-1.5",
        "font-sans text-[11px] font-semibold text-muted tabular-nums",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </kbd>
  );
}
