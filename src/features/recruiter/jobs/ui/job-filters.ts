/**
 * Filtros del listado de búsquedas. Módulo neutro (sin "use client") para que lo importen
 * tanto la page (server) como JobsList (client) sin cruzar el límite server/cliente.
 */

// "all" + cada estado. Fuente de verdad del query param `?status=`.
export const JOB_FILTERS = ["all", "open", "paused", "draft", "closed"] as const;
export type JobFilter = (typeof JOB_FILTERS)[number];

export function isJobFilter(value: string | undefined): value is JobFilter {
  return value !== undefined && (JOB_FILTERS as readonly string[]).includes(value);
}

export const FILTER_LABEL: Record<JobFilter, string> = {
  all: "Todas",
  open: "Abiertas",
  paused: "Pausadas",
  draft: "Borradores",
  closed: "Cerradas",
};
