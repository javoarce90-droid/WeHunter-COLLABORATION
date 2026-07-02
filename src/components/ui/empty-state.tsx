import type { ReactNode } from "react";
import Link from "next/link";

type EmptyStateAction =
  | { label: string; href: string; onClick?: never }
  | { label: string; href?: never; onClick: () => void };

interface EmptyStateProps {
  /** Ícono opcional dentro del círculo púrpura (activación). */
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  /** CTA principal. `href` navega; `onClick` requiere Client Component. */
  action?: EmptyStateAction;
  /** `activation` = primera vez (borde punteado púrpura, ícono). `subtle` = vacío de filtro. */
  variant?: "activation" | "subtle" | "plain";
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
  const variantClasses =
    variant === "activation"
      ? "border border-dashed border-primary/25 bg-bg px-6 py-14"
      : variant === "subtle"
        ? "border border-border bg-surface px-6 py-12 shadow-[var(--shadow)]"
        : "px-6 py-8";
  return (
    <div
      className={[
        "rounded-[var(--radius)] text-center",
        variantClasses,
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
      {action && action.href ? (
        <Link
          href={action.href}
          className="mt-5 inline-flex items-center justify-center rounded-[var(--radius)] bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          {action.label}
        </Link>
      ) : action ? (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-5 inline-flex items-center justify-center rounded-[var(--radius)] bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
