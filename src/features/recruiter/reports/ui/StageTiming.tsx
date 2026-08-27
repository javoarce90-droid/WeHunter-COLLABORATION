import { STAGE_LABELS, type ApplicationStage } from "@/features/recruiter/applications/schema";
import { STAGE_DOT } from "@/features/recruiter/applications/ui/stage-visual";
import { SectionCard } from "@/components/ui/section-card";
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
export function StageTiming({
  perf,
  labels,
}: {
  perf: JobPerformance;
  /** Nombres de etapa reales de la búsqueda (de `job_stages`); sin esto se usa el label
   *  genérico del enum. */
  labels?: Partial<Record<ApplicationStage, string>>;
}) {
  const { timeToHireDays, avgTimeInStage, trackedCount } = perf;

  return (
    <SectionCard
      title="Tiempos del proceso"
      action={
        trackedCount > 0 ? (
          <span className="text-xs text-muted">{trackedCount} con historial</span>
        ) : undefined
      }
    >
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
              {avgTimeInStage.map((s) => {
                // Solo se marca cuando SUPERA el SLA — dentro del SLA (o sin SLA configurado
                // para esa etapa) no agrega nada a la fila (PRODUCT.md: "confianza sin
                // ceremonia", no confirma que todo está bien, solo avisa cuando no lo está).
                const overSla = s.slaDays != null && s.days > s.slaDays;
                const label = labels?.[s.stage] ?? STAGE_LABELS[s.stage];
                return (
                  <div key={s.stage} className="flex items-center gap-3 text-sm">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: STAGE_DOT[s.stage] }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-text" title={label}>
                      {label}
                    </span>
                    {overSla && (
                      <span className="text-xs font-semibold text-warning">
                        Supera el SLA de {s.slaDays} d
                      </span>
                    )}
                    <span
                      className={[
                        "font-medium tabular-nums",
                        overSla ? "text-warning" : "text-muted",
                      ].join(" ")}
                    >
                      {formatDays(s.days)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}
