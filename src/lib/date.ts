const pad = (n: number) => String(n).padStart(2, "0");

/** Date → "yyyy-MM-dd" en hora LOCAL (no UTC — Date#toISOString corre a UTC y puede correr
 *  la fecha un día para atrás/adelante según el huso horario del usuario). */
export function toLocalDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Date → "yyyy-MM-ddThh:mm" en hora local, para un <input type="datetime-local">. */
export function toLocalDateTimeInputValue(date: Date): string {
  return `${toLocalDateInputValue(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Valor de `min` para bloquear fechas anteriores a hoy en un <input type="date">. */
export function todayDateInputValue(): string {
  return toLocalDateInputValue(new Date());
}

/** Valor de `min` para bloquear fechas anteriores a hoy en un <input type="datetime-local">
 *  — inicio del día de hoy (00:00), no el instante actual: alcanza con bloquear el DÍA,
 *  no el minuto exacto (pedido del cliente: "fecha anterior a hoy"). */
export function todayDateTimeInputValue(): string {
  return `${todayDateInputValue()}T00:00`;
}

/**
 * "yyyy-MM-ddThh:mm" (valor crudo de un <input type="datetime-local">, SIN huso horario) →
 * ISO 8601 con offset explícito ("...Z"), evaluado en el huso del NAVEGADOR — llamar esto
 * del lado del cliente, nunca en el servidor.
 *
 * Por qué hace falta: un datetime-local no lleva huso horario. Si el string crudo viaja tal
 * cual al servidor y se parsea ahí con `new Date(string)`/`z.coerce.date()`, JS lo interpreta
 * en el huso horario del PROCESO QUE LO PARSEA — en dev coincide con el huso del desarrollador
 * y nunca se nota, pero en producción (server en UTC) un horario propuesto por un usuario en
 * Argentina se corre ~3 horas. Convertir a ISO con offset ACÁ, antes de mandarlo, saca la
 * ambigüedad: el servidor ya recibe un instante absoluto, no un string relativo a interpretar.
 */
export function localDateTimeValueToISOString(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** true si `value` ("yyyy-MM-dd", como llega de un <input type="date">) ya es anterior a hoy.
 *  Para no aplicarle `min={hoy}` a un campo que YA tiene guardada una fecha pasada legítima
 *  (ej. editar el registro de una oferta vieja) — eso lo dejaría con un `min` mayor a su
 *  propio valor, que el navegador marca inválido y bloquea el submit por un campo sin tocar. */
export function isPastDateString(value?: string | null): boolean {
  if (!value) return false;
  return value < todayDateInputValue();
}
