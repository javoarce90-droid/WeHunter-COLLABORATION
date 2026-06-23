import { cache } from "react";

/**
 * Observabilidad de performance del servidor (Server-Timing + log en dev).
 *
 * Para qué: ver cuánto tarda CADA parte del servidor (queries, auth) en una request,
 * y detectar round-trips duplicados (ej. la misma membership pedida dos veces).
 *
 * Cómo se ve:
 *  - En DESARROLLO: cada medición se loguea en la terminal al instante. Si ves la misma
 *    etiqueta dos veces en un load, hay una query duplicada.
 *  - En ROUTE HANDLERS / SERVER ACTIONS que devuelven Response: podés emitir el header
 *    Server-Timing con getServerTimingHeader() y verlo en DevTools > Network > Timing.
 *
 * Limitación honesta: en páginas RSC (Server Components que se streamean) no se puede
 * setear el header de respuesta a mano de forma simple. Para esas, la observabilidad real
 * es el log en terminal (que SÍ funciona en todos lados). Para endpoints, usás el header.
 */

type TimingEntry = { label: string; dur: number };

// Colector por request: cache() garantiza una sola instancia por request.
const getCollector = cache((): { entries: TimingEntry[] } => ({ entries: [] }));

const isDev = process.env.NODE_ENV !== "production";

/**
 * Mide una operación async, la registra y (en dev) la loguea.
 * Uso: const rows = await measure("db.kpis", () => getJobCounts(...));
 */
export async function measure<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const dur = performance.now() - start;
    getCollector().entries.push({ label, dur });
    if (isDev) {
      console.log(`[server-timing] ${label}: ${dur.toFixed(0)}ms`);
    }
  }
}

/**
 * Header Server-Timing con todo lo medido en este request.
 * Usar en Route Handlers / Server Actions que devuelven Response:
 *   return new Response(body, { headers: { "Server-Timing": getServerTimingHeader() } });
 */
export function getServerTimingHeader(): string {
  return getCollector()
    .entries.map(
      (e, i) =>
        `${e.label.replace(/[^a-zA-Z0-9_-]/g, "_")}_${i};dur=${e.dur.toFixed(1)}`,
    )
    .join(", ");
}

/**
 * Resumen agrupado del request. Útil para asserts en tests o para loguear al cerrar.
 * Si count es alto o una etiqueta se repite, hay round-trips de más.
 */
export function getServerTimingSummary() {
  const { entries } = getCollector();
  const total = entries.reduce((acc, e) => acc + e.dur, 0);
  return { count: entries.length, totalMs: Math.round(total), entries };
}
