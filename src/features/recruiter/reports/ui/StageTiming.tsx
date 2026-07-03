import { STAGE_LABELS } from "@/features/recruiter/applications/schema";
import { STAGE_DOT } from "@/features/recruiter/applications/ui/stage-visual";
import type { JobPerformance } from "../domain/job-performance";

function formatDays(days: number): string {
  if (days < 1) return "< 1 día";
  const rounded = Math.round(days * 10) / 10;
  return `${rounded} día${rounded !== 1 ? "s" : ""}`;
}

/**
 * Tiempos del proceso: time-to-hire destacado + promedio por etapa.
 * Las métricas se basan solo en postulaciones con historial registrado — lo decimos
 * explícitamente para no dar una falsa sensación de completitud.
 */
export function StageTiming({ perf }: { perf: JobPerformance }) {
  const { timeToHireDays, avgTimeInStage, trackedCount } = perf;

  return (
    <section className="rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow)]">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-bold text-text">Tiempos del proceso</h2>
        {trackedCount > 0 && (
          <span className="text-xs text-muted">
            {trackedCount} con historial
          </span>
        )}
      </div>

      {trackedCount === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          Los tiempos se calculan a medida que movés candidatos por el pipeline. Todavía no
          hay movimientos registrados para esta búsqueda.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Time-to-hire */}
          <div className="flex items-baseline gap-2">
            {timeToHireDays !== null ? (
              <>
                <span className="font-display text-2xl font-bold text-text tabular-nums">
                  {formatDays(timeToHireDays)}
                </span>
                <span className="text-xs text-muted">promedio hasta contratar</span>
              </>
            ) : (
              <span className="text-sm text-muted">
                Sin contrataciones todavía — el time-to-hire aparece al contratar al primero.
              </span>
            )}
          </div>

          {/* Promedio por etapa */}
          {avgTimeInStage.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-label">
                Promedio por etapa
              </h3>
              {avgTimeInStage.map((s) => (
                <div key={s.stage} className="flex items-center gap-2.5 text-sm">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: STAGE_DOT[s.stage] }}
                    aria-hidden
                  />
                  <span className="flex-1 text-text">{STAGE_LABELS[s.stage]}</span>
                  <span className="font-medium text-muted tabular-nums">
                    {formatDays(s.days)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
