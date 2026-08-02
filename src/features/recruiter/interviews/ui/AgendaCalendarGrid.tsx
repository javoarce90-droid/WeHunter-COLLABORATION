import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { AgendaInterview } from "../data/interviews.queries";
import { TYPE_BADGE } from "../schema";

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const MAX_CHIPS_PER_DAY = 3;

const timeFmt = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" });

/** yyyy-mm anterior/siguiente al mes recibido, para los links de navegación. */
function shiftMonth(year: number, month: number, delta: number): string {
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type Props = {
  year: number;
  /** 1-12. */
  month: number;
  /** Todas las entrevistas de la org (sin filtrar por mes) — se filtran acá adentro. */
  interviews: AgendaInterview[];
  /** Si no viene, el grid queda de solo lectura (sin click en los eventos). */
  onSelectInterview?: (interview: AgendaInterview) => void;
};

/** Grid mensual de calendario (7 columnas). Presentacional y puro: recibe el mes a mostrar
 *  y filtra en memoria las entrevistas de ese mes — no hace fetch propio. */
export function AgendaCalendarGrid({ year, month, interviews, onSelectInterview }: Props) {
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month - 1;

  const byDay = new Map<number, AgendaInterview[]>();
  for (const iv of interviews) {
    if (iv.scheduledAt.getFullYear() === year && iv.scheduledAt.getMonth() === month - 1) {
      const day = iv.scheduledAt.getDate();
      const list = byDay.get(day);
      if (list) list.push(iv);
      else byDay.set(day, [iv]);
    }
  }

  const firstDow = new Date(year, month - 1, 1).getDay();
  const totalDays = new Date(year, month, 0).getDate();

  const cells: Array<{ day: number | null }> = [];
  for (let i = 0; i < firstDow; i++) cells.push({ day: null });
  for (let d = 1; d <= totalDays; d++) cells.push({ day: d });

  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <b className="font-display text-sm font-bold text-text">
          {MONTH_NAMES[month - 1]} {year}
        </b>
        <div className="ml-auto flex gap-1">
          <Link
            href={`/agenda?month=${shiftMonth(year, month, -1)}`}
            aria-label="Mes anterior"
            className="grid h-7 w-7 place-items-center rounded-[var(--radius)] border border-border text-muted transition-colors hover:bg-bg hover:text-text"
          >
            ‹
          </Link>
          <Link
            href={`/agenda?month=${shiftMonth(year, month, 1)}`}
            aria-label="Mes siguiente"
            className="grid h-7 w-7 place-items-center rounded-[var(--radius)] border border-border text-muted transition-colors hover:bg-bg hover:text-text"
          >
            ›
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="border-b border-border py-2 text-center text-[10.5px] font-bold uppercase tracking-wide text-muted"
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          if (cell.day === null) {
            return <div key={`blank-${i}`} className="min-h-16 border-b border-l border-border bg-bg/50" />;
          }
          const events = byDay.get(cell.day) ?? [];
          const isToday = isCurrentMonth && cell.day === today.getDate();
          const visible = events.slice(0, MAX_CHIPS_PER_DAY);
          const overflow = events.length - visible.length;
          return (
            <div key={cell.day} className="min-h-16 border-b border-l border-border p-1">
              <span
                className={[
                  "inline-grid h-5 w-5 place-items-center rounded-full text-xs tabular-nums",
                  isToday ? "bg-primary font-bold text-white" : "text-muted",
                ].join(" ")}
              >
                {cell.day}
              </span>
              <div className="mt-0.5 flex flex-col gap-0.5">
                {visible.map((iv) =>
                  onSelectInterview ? (
                    <button
                      key={iv.id}
                      type="button"
                      onClick={() => onSelectInterview(iv)}
                      className="block w-full truncate text-left"
                    >
                      <Badge variant={TYPE_BADGE[iv.type]} className="block w-full truncate">
                        {timeFmt.format(iv.scheduledAt)} {iv.candidateName.split(" ")[0]}
                      </Badge>
                    </button>
                  ) : (
                    <Badge key={iv.id} variant={TYPE_BADGE[iv.type]} className="block w-full truncate">
                      {timeFmt.format(iv.scheduledAt)} {iv.candidateName.split(" ")[0]}
                    </Badge>
                  ),
                )}
                {overflow > 0 && (
                  <span className="px-1 text-[10.5px] font-semibold text-muted">+{overflow} más</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
