/**
 * Normaliza una URL escrita por alguien que no sabe (ni tiene por qué) poner el protocolo.
 * "sitio.com" o "www.sitio.com" → "https://sitio.com". Si ya trae esquema (http://, https://)
 * se respeta tal cual. Vacío o solo espacios → "".
 *
 * NO valida que la URL sea real: de eso se encarga la validación de después (Zod `.url()`).
 * Acá solo garantizamos que tenga esquema, que es lo único que un usuario normal se olvida y
 * lo que hace que `new URL()` / `.url()` la rechacen.
 */
export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // Ya tiene esquema con "://" (http, https, ftp, …): no lo tocamos.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;
  // Protocol-relative ("//host"): completamos con https.
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return `https://${trimmed}`;
}

/**
 * Preprocesador para un campo de URL opcional en Zod: vacío → undefined; si no, normaliza el
 * protocolo. Se usa como primer argumento de `z.preprocess(...)` en los schemas de input.
 */
export function toOptionalUrl(v: unknown): string | undefined {
  if (typeof v !== "string" || v.trim() === "") return undefined;
  return normalizeUrl(v);
}
