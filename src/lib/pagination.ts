export const PAGE_SIZE = 10;

/** Un `searchParams` de Next puede traer un array si el param se repite en la URL — nos
 *  quedamos con el primer valor. Cualquier cosa que no sea un entero positivo cae a la 1. */
export function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export function paginationRange(page: number, pageSize: number = PAGE_SIZE): {
  limit: number;
  offset: number;
} {
  return { limit: pageSize, offset: (page - 1) * pageSize };
}

/** Nunca 0: una lista vacía sigue siendo "página 1 de 1", no "de 0". */
export function totalPages(totalCount: number, pageSize: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(totalCount / pageSize));
}
