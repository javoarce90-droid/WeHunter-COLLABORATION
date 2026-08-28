/**
 * Filtros del listado de agenda. Módulo neutro (sin "use client") para que lo importen tanto
 * la page (server) como `AgendaFilters` (client) sin cruzar el límite server/cliente.
 * Espeja el patrón de `job-filters.ts` / `PeriodFilter.tsx`.
 */

/** Fuente de verdad del query param `?range=`. La agenda mira sobre todo al futuro, así que
 *  los rangos son hacia adelante salvo "past". "all" = comportamiento histórico (próximas +
 *  pasadas, sin corte). */
export const AGENDA_RANGES = ["all", "next7", "next30", "month", "past"] as const;
export type AgendaRange = (typeof AGENDA_RANGES)[number];

export const DEFAULT_AGENDA_RANGE: AgendaRange = "all";

export function isAgendaRange(value: string | undefined): value is AgendaRange {
  return value !== undefined && (AGENDA_RANGES as readonly string[]).includes(value);
}

export const AGENDA_RANGE_LABELS: Record<AgendaRange, string> = {
  all: "Todo",
  next7: "Próximos 7 días",
  next30: "Próximos 30 días",
  month: "Este mes",
  past: "Pasadas",
};

/** Convierte el rango a límites `[from, to)` para el `WHERE` sobre `interviews.scheduledAt`
 *  (`null` = sin corte por ese lado). Mismo criterio que `periodSince` en `PeriodFilter.tsx`. */
export function agendaRangeBounds(
  range: AgendaRange,
  now: Date,
): { from: Date | null; to: Date | null } {
  switch (range) {
    case "all":
      return { from: null, to: null };
    case "past":
      return { from: null, to: now };
    case "next7": {
      const to = new Date(now);
      to.setDate(to.getDate() + 7);
      return { from: now, to };
    }
    case "next30": {
      const to = new Date(now);
      to.setDate(to.getDate() + 30);
      return { from: now, to };
    }
    case "month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { from, to };
    }
  }
}
