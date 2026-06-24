import { CANDIDATE_SOURCE_LABELS } from "@/features/recruiter/candidates/ui/source-meta";
import type { CandidateSource } from "@/features/recruiter/candidates/domain/candidate-details";
import type { JobPerformance } from "../domain/job-performance";

function sourceLabel(source: string): string {
  if (source === "unknown") return "Sin especificar";
  return CANDIDATE_SOURCE_LABELS[source as CandidateSource] ?? source;
}

/** Origen de los candidatos de la búsqueda. Barras proporcionales, sin color semántico. */
export function SourceBreakdown({
  breakdown,
}: {
  breakdown: JobPerformance["sourceBreakdown"];
}) {
  const total = breakdown.reduce((sum, s) => sum + s.count, 0);
  const max = Math.max(1, ...breakdown.map((s) => s.count));

  return (
    <section className="rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-text">Origen de candidatos</h2>
        <span className="text-xs text-muted">
          <span className="font-semibold text-text tabular-nums">{total}</span> candidato
          {total !== 1 ? "s" : ""}
        </span>
      </div>

      {total === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          Todavía no hay candidatos postulados a esta búsqueda.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {breakdown.map((s) => {
            const pct = Math.round((s.count / max) * 100);
            const share = Math.round((s.count / total) * 100);
            return (
              <div key={s.source} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-xs font-medium text-muted">
                  {sourceLabel(s.source)}
                </span>
                <div className="h-6 flex-1 overflow-hidden rounded-md bg-bg">
                  <div
                    className="flex h-full items-center justify-end rounded-md bg-primary/80 px-2"
                    style={{ width: `${Math.max(pct, 6)}%` }}
                  >
                    <span className="text-[11px] font-bold text-white tabular-nums">
                      {s.count}
                    </span>
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
