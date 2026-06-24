import type { ReactNode } from "react";
import Link from "next/link";

interface EmptyStateProps {
  /** Ícono opcional dentro del círculo púrpura (activación). */
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  /** CTA principal. `href` → navegación; `onClick` no se usa acá (server-safe). */
  action?: { label: string; href: string };
  /** `activation` = primera vez (borde punteado púrpura, ícono). `subtle` = vacío de filtro. */
  variant?: "activation" | "subtle";
  className?: string;
}

/**
 * Estado vacío unificado. Reemplaza los bloques dashed duplicados en JobsList, AgendaView,
 * pipeline, candidates y shortlists. `activation` enseña la interfaz; `subtle` solo informa.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "activation",
  className = "",
}: EmptyStateProps) {
  const isActivation = variant === "activation";
  return (
    <div
      className={[
        "rounded-[var(--radius)] text-center",
        isActivation
          ? "border border-dashed border-primary/25 bg-bg px-6 py-14"
          : "border border-border bg-surface px-6 py-12 shadow-[var(--shadow)]",
        className,
      ].join(" ")}
    >
      {icon && (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary">
          {icon}
        </div>
      )}
      <h3 className="font-display text-base font-bold text-text">{title}</h3>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{description}</p>
      )}
      {action && (
        <Link
          href={action.href}
          className="mt-5 inline-flex items-center justify-center rounded-[var(--radius)] bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
