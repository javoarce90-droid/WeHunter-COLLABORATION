const MONTH_ABBR: Record<string, number> = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5,
  jun: 6, jul: 7, ago: 8, aug: 8, sep: 9, oct: 10, nov: 11, dic: 12, dec: 12,
};

/**
 * Convierte una fecha de currículum en texto libre (lo que devuelven los proveedores de
 * Sourcing — HarvestAPI: "Mar 2025", "2004"; el fallback determinístico: "2022-01"; `null` =
 * "actualidad" o sin dato) a un string de fecha que Postgres acepte en una columna `date`
 * (`candidate_work_experiences`/`candidate_education`, ambas exigen día completo, no solo
 * mes/año — un `TypeError`/`PostgresError` real de "invalid input syntax for type date" es lo
 * que pasa si se inserta texto libre tal cual, confirmado en producción 2026-09-15).
 *
 * Sin día real disponible, usa el día 1 del mes (o de enero, si tampoco hay mes) — se pierde
 * precisión de día, nunca de año/mes; sin año reconocible, devuelve `null` en vez de inventar
 * uno. El texto legible original ("Mar 2025") solo se muestra en el preview de resultados de
 * Sourcing (antes de importar, nunca toca esta función) — acá es exclusivamente para lo que
 * persiste en la base.
 */
export function parseResumeDateToDb(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Ya es una fecha real (YYYY-MM-DD o YYYY-MM) — Postgres acepta ambos formatos tal cual.
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(trimmed)) return trimmed;
  const year = trimmed.match(/\b(19|20)\d{2}\b/)?.[0];
  if (!year) return null;
  const monthWord = trimmed.match(/[a-zA-ZáéíóúÁÉÍÓÚ]{3,}/)?.[0]?.slice(0, 3).toLowerCase();
  const month = (monthWord && MONTH_ABBR[monthWord]) || 1;
  return `${year}-${String(month).padStart(2, "0")}-01`;
}
