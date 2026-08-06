import Link from "next/link";
import type { ReactNode } from "react";

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-surface";

const linkBase = `inline-flex items-center gap-1 rounded-[var(--radius)] px-3 py-2 text-xs font-semibold transition-colors ${focusRing}`;

function PageControl({
  disabled,
  href,
  onClick,
  children,
}: {
  disabled: boolean;
  href?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={`${linkBase} cursor-not-allowed text-muted/50`}
      >
        {children}
      </span>
    );
  }
  if (href) {
    return (
      <Link
        href={href}
        className={`${linkBase} text-muted hover:bg-bg hover:text-primary`}
      >
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${linkBase} text-muted hover:bg-bg hover:text-primary`}
    >
      {children}
    </button>
  );
}

type PaginationProps = {
  page: number;
  totalPages: number;
} & (
  | { buildHref: (page: number) => string; onPageChange?: never }
  | { onPageChange: (page: number) => void; buildHref?: never }
);

/**
 * Paginación compartida en dos modos: `buildHref` navega por link (server-driven, sin JS,
 * no pisa otros searchParams — el caso por defecto); `onPageChange` pagina en memoria un
 * array ya filtrado/ordenado en el cliente, para pantallas donde el filtro no puede vivir en
 * SQL (ej. Postulados, cuyo orden depende de criterios de screening calculados en JS).
 */
export function Pagination({
  page,
  totalPages: total,
  buildHref,
  onPageChange,
}: PaginationProps) {
  if (total <= 1) return null;

  return (
    <nav
      aria-label="Paginación"
      className="flex items-center justify-between gap-4 border-t border-border pt-4"
    >
      <PageControl
        disabled={page <= 1}
        href={buildHref?.(page - 1)}
        onClick={onPageChange ? () => onPageChange(page - 1) : undefined}
      >
        ← Anterior
      </PageControl>
      <span className="text-xs font-medium text-muted">
        Página {page} de {total}
      </span>
      <PageControl
        disabled={page >= total}
        href={buildHref?.(page + 1)}
        onClick={onPageChange ? () => onPageChange(page + 1) : undefined}
      >
        Siguiente →
      </PageControl>
    </nav>
  );
}
