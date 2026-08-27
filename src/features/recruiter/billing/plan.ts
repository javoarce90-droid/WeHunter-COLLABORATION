/**
 * Helpers de presentación de planes. Los valores de cada plan (nombre, precio, moneda, días
 * de prueba, tope de miembros) viven en la tabla `plans` — ver `data/plans.queries.ts`.
 */

/** Email al que escribe el recruiter si tiene un problema con el pago. */
export const SUPPORT_EMAIL = "hola@we-hunter.com";

/** Etiqueta de precio ya formateada (es-AR usa coma decimal). Ej: "USD 99,99". */
export function formatPrice(price: string | number, currency: string): string {
  const n = typeof price === "string" ? Number(price) : price;
  return `${currency} ${n.toFixed(2).replace(".", ",")}`;
}
