import { APPLICATION_STAGES, STAGE_LABELS } from "../schema";
import type { ApplicationStage } from "../schema";
import type { ApplicationWithCandidate } from "../data/applications.queries";
import { PipelineCard } from "./PipelineCard";

type Props = {
  applications: ApplicationWithCandidate[];
};

function groupByStage(
  apps: ApplicationWithCandidate[],
): Record<ApplicationStage, ApplicationWithCandidate[]> {
  const grouped = Object.fromEntries(
    APPLICATION_STAGES.map((s) => [s, [] as ApplicationWithCandidate[]]),
  ) as Record<ApplicationStage, ApplicationWithCandidate[]>;

  for (const app of apps) {
    grouped[app.stage].push(app);
  }
  return grouped;
}

const STAGE_COLUMN_WIDTH = "min-w-[220px] w-[220px]";

export function PipelineBoard({ applications }: Props) {
  const grouped = groupByStage(applications);

  if (applications.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-surface p-10 text-center text-sm text-muted">
        No hay candidatos en el pipeline todavía. Postulá candidatos desde el pool.
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {APPLICATION_STAGES.map((stage) => {
        const cards = grouped[stage];
        return (
          <div key={stage} className={`flex flex-col gap-3 ${STAGE_COLUMN_WIDTH}`}>
            {/* Cabecera de columna */}
            <div className="flex items-center justify-between rounded-[var(--radius)] border border-border bg-surface px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                {STAGE_LABELS[stage]}
              </span>
              <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[11px] font-bold text-muted">
                {cards.length}
              </span>
            </div>

            {/* Cards de candidatos */}
            <div className="flex flex-col gap-2">
              {cards.length === 0 && (
                <div className="rounded-[var(--radius)] border border-dashed border-border px-3 py-6 text-center text-xs text-muted">
                  Sin candidatos
                </div>
              )}
              {cards.map((app) => (
                <PipelineCard key={app.id} application={app} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
