import type { Job } from "@/db/schema";

/** Metadatos de presentación del estado de una búsqueda. Definidos una sola vez y reusados
 *  por el listado y el workspace (conventions.md: los tipos/meta de dominio no se duplican). */

type Status = Job["status"];

export const JOB_STATUS_META: Record<
  Status,
  { label: string; variant: "muted" | "success" | "warning" | "danger" }
> = {
  draft: { label: "Borrador", variant: "muted" },
  open: { label: "Abierta", variant: "success" },
  paused: { label: "Pausada", variant: "warning" },
  closed: { label: "Cerrada", variant: "danger" },
};

// Tiempo relativo en es-AR. Usado en Server Components → se renderiza una sola vez.
const rtf = new Intl.RelativeTimeFormat("es-AR", { numeric: "auto" });

export function relativeTime(date: Date): string {
  const sec = Math.round((date.getTime() - Date.now()) / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);
  if (Math.abs(sec) < 60) return "recién";
  if (Math.abs(min) < 60) return rtf.format(min, "minute");
  if (Math.abs(hr) < 24) return rtf.format(hr, "hour");
  if (Math.abs(day) < 30) return rtf.format(day, "day");
  const mon = Math.round(day / 30);
  if (Math.abs(mon) < 12) return rtf.format(mon, "month");
  return rtf.format(Math.round(mon / 12), "year");
}
