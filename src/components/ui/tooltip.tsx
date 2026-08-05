import type { ReactNode } from "react";

interface TooltipProps {
  label: string;
  children: ReactNode;
  side?: "top" | "bottom";
  /** `center` (default) centra sobre el trigger; `start` lo ancla a su borde izquierdo.
   * Usá `start` cuando el trigger está pegado al borde de un contenedor angosto (ej. un
   * modal con `overflow-y-auto`): centrado, el tooltip se sale de ese borde y el `overflow`
   * del contenedor lo recorta — no hay forma CSS-only de "voltearlo" automáticamente. */
  align?: "center" | "start";
  className?: string;
}

/**
 * Tooltip ligero CSS-only (hover/focus-within) para iconos de toolbar. Sin JS ni deps.
 * El texto va también como contexto accesible; el target debe tener su propio aria-label.
 */
export function Tooltip({
  label,
  children,
  side = "top",
  align = "center",
  className = "",
}: TooltipProps) {
  return (
    <span className={["group/tt relative inline-flex", className].join(" ")}>
      {children}
      <span
        role="tooltip"
        className={[
          "pointer-events-none absolute z-[var(--z-tooltip)]",
          "w-max max-w-[220px]",
          align === "center"
            ? "left-1/2 -translate-x-1/2 text-center"
            : "left-0 text-left",
          "rounded-md bg-text px-2 py-1 text-[11px] font-medium text-white",
          "opacity-0 transition-opacity duration-[var(--motion-fast)]",
          "group-hover/tt:opacity-100 group-focus-within/tt:opacity-100",
          side === "top" ? "bottom-full mb-2" : "top-full mt-2",
        ].join(" ")}
      >
        {label}
      </span>
    </span>
  );
}
