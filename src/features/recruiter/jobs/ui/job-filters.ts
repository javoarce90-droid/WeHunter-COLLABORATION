/**
 * Filtros del listado de búsquedas. Módulo neutro (sin "use client") para que lo importen
 * tanto la page (server) como JobsList (client) sin cruzar el límite server/cliente.
 */

// "all" + cada estado. Fuente de verdad del query param `?status=`. "all" excluye
// `archived`: archivar existe justamente para sacar la búsqueda de las listas activas.
export const JOB_FILTERS = [
  "all",
  "open",
  "paused",
  "draft",
  "closed",
  "archived",
] as const;
export type JobFilter = (typeof JOB_FILTERS)[number];

export function isJobFilter(value: string | undefined): value is JobFilter {
  return (
    value !== undefined && (JOB_FILTERS as readonly string[]).includes(value)
  );
}

export const FILTER_LABEL: Record<JobFilter, string> = {
  all: "Todas",
  open: "Abiertas",
  paused: "Pausadas",
  draft: "Borradores",
  closed: "Cerradas",
  archived: "Archivadas",
};

/** Selector "Ordenar por" del listado — solo estas 6 combinaciones, todas sobre columnas
 *  reales de `jobs` (nunca sobre `receivedCount`/`pendingCount`, que son agregados calculados
 *  con `count()` y no existen como columna para un `ORDER BY` fuera de la propia proyección). */
export const JOB_SORT_KEYS = [
  "createdAt_desc",
  "createdAt_asc",
  "updatedAt_desc",
  "updatedAt_asc",
  "title_asc",
  "title_desc",
] as const;
export type JobSortKey = (typeof JOB_SORT_KEYS)[number];

export const DEFAULT_JOB_SORT: JobSortKey = "createdAt_desc";

export function isJobSortKey(value: string | undefined): value is JobSortKey {
  return (
    value !== undefined && (JOB_SORT_KEYS as readonly string[]).includes(value)
  );
}

export const SORT_LABEL: Record<JobSortKey, string> = {
  updatedAt_desc: "Última actualización (más reciente)",
  updatedAt_asc: "Última actualización (más antigua)",
  createdAt_desc: "Fecha de creación (más reciente)",
  createdAt_asc: "Fecha de creación (más antigua)",
  title_asc: "Título A-Z",
  title_desc: "Título Z-A",
};
