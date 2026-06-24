import type { ReactNode } from "react";

interface TooltipProps {
  label: string;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}

/**
 * Tooltip ligero CSS-only (hover/focus-within) para iconos de toolbar. Sin JS ni deps.
 * El texto va también como contexto accesible; el target debe tener su propio aria-label.
 */
export function Tooltip({ label, children, side = "top", className = "" }: TooltipProps) {
  return (
    <span className={["group/tt relative inline-flex", className].join(" ")}>
      {children}
      <span
        role="tooltip"
        className={[
          "pointer-events-none absolute left-1/2 z-[var(--z-tooltip)] -translate-x-1/2 whitespace-nowrap",
          "rounded-md bg-text px-2 py-1 text-[11px] font-medium text-white",
          "opacity-0 transition-opacity duration-[var(--motion-fast)]",
          "group-hover/tt:opacity-100 group-focus-within/tt:opacity-100",
          side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
        ].join(" ")}
      >
        {label}
      </span>
    </span>
  );
}
