import type { HTMLAttributes } from "react";

/**
 * Bloque de carga genérico. Skeleton in-place (no spinner suelto): mantiene el layout
 * mientras llega el dato. Componer varios para reconstruir la silueta de lo que carga.
 */
export function Skeleton({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={["animate-pulse rounded bg-border", className].join(" ")}
      {...props}
    />
  );
}
