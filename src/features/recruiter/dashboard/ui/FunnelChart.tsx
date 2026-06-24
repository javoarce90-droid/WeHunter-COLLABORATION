import { STAGE_LABELS } from "@/features/recruiter/applications/schema";
import { STAGE_DOT } from "@/features/recruiter/applications/ui/stage-visual";
import type { DashboardKpis } from "../domain/obtener-kpis";

/**
 * Funnel de conversión por etapa (reporte §12 del backlog). Barras horizontales
 * proporcionales al máximo, en el orden del pipeline. Lectura agregada en una sola query
 * (reusa el byStage del KPI, sin transacción extra — database.md #3).
 */
export function FunnelChart({ funnel }: { funnel: DashboardKpis["funnel"] }) {
  const total = funnel.reduce((sum, f) => sum + f.count, 0);
  const max = Math.max(1, ...funnel.map((f) => f.count));

  return (
    <section className="rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-text">Funnel de conversión</h2>
        <span className="text-xs text-muted">
          <span className="font-semibold text-text tabular-nums">{total}</span> postulaciones
        </span>
      </div>

      {total === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          Todavía no hay postulaciones para graficar. El funnel se arma a medida que movés
          candidatos por el pipeline.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {funnel.map((f) => {
            const pct = Math.round((f.count / max) * 100);
            const share = total > 0 ? Math.round((f.count / total) * 100) : 0;
            return (
              <div key={f.stage} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs font-medium text-muted">
                  {STAGE_LABELS[f.stage]}
                </span>
                <div className="h-6 flex-1 overflow-hidden rounded-md bg-bg">
                  <div
                    className="flex h-full items-center justify-end rounded-md px-2 transition-[width] duration-[var(--motion-slow)]"
                    style={{
                      width: `${Math.max(pct, f.count > 0 ? 6 : 0)}%`,
                      background: STAGE_DOT[f.stage],
                    }}
                  >
                    {f.count > 0 && (
                      <span className="text-[11px] font-bold text-white tabular-nums">
                        {f.count}
                      </span>
                    )}
                  </div>
                </div>
                <span className="w-10 shrink-0 text-right text-xs text-muted tabular-nums">
                  {share}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
