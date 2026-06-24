import { APPLICATION_STAGES, STAGE_LABELS } from "../schema";
import type { ApplicationStage } from "../schema";
import type { ApplicationWithCandidate } from "../data/applications.queries";
import type { InterviewRow } from "@/features/recruiter/interviews/domain/agendar-entrevista";
import { PipelineCard } from "./PipelineCard";

type Props = {
  applications: ApplicationWithCandidate[];
  /** Entrevistas agrupadas por applicationId (una query, sin N+1). */
  interviewsByApplication: Record<string, InterviewRow[]>;
};

// Color sólido por etapa para el marcador de la columna (semántica de DESIGN.md).
const STAGE_DOT: Record<ApplicationStage, string> = {
  new: "#9CA3AF",
  screening: "#2563EB",
  interview: "#D97706",
  offer: "#7B2FDB",
  hired: "#059669",
  rejected: "#DC2626",
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

export function PipelineBoard({ applications, interviewsByApplication }: Props) {
  const grouped = groupByStage(applications);

  if (applications.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-dashed border-primary/25 bg-bg p-10 text-center text-sm text-muted">
        No hay candidatos en el pipeline todavía. Postulá candidatos desde el pool
        con el botón <span className="font-semibold text-text">Postular candidato</span>.
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {APPLICATION_STAGES.map((stage) => {
        const cards = grouped[stage];
        return (
          <section
            key={stage}
            className="flex w-[260px] shrink-0 flex-col gap-2.5 rounded-xl bg-text/[0.035] p-2.5"
          >
            {/* Cabecera de columna: marcador de etapa + label + conteo */}
            <header className="flex items-center gap-2 px-1">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: STAGE_DOT[stage] }}
                aria-hidden
              />
              <h3 className="text-sm font-semibold text-text">
                {STAGE_LABELS[stage]}
              </h3>
              <span className="ml-auto text-xs font-semibold text-muted tabular-nums">
                {cards.length}
              </span>
            </header>

            {/* Cards de candidatos */}
            <div className="flex flex-col gap-2">
              {cards.length === 0 ? (
                <div className="rounded-[var(--radius)] border border-dashed border-border px-3 py-6 text-center text-xs text-muted">
                  Sin candidatos
                </div>
              ) : (
                cards.map((app) => (
                  <PipelineCard
                    key={app.id}
                    application={app}
                    interviews={interviewsByApplication[app.id] ?? []}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
