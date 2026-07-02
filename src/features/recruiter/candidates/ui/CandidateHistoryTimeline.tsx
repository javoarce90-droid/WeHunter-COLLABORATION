import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { STAGE_LABELS } from "@/features/recruiter/applications/schema";
import type {
  CandidateApplication,
  StageHistoryEvent,
} from "@/features/recruiter/applications/data/applications.queries";
import { StageHistoryTimeline } from "@/features/recruiter/applications/ui/StageHistoryTimeline";
import { NoteList } from "@/features/recruiter/notes/ui/NoteList";
import type { TimelineNote } from "@/features/recruiter/notes/data/notes.queries";

type Props = {
  applications: CandidateApplication[];
  notesByApplication: Record<string, TimelineNote[]>;
  stageEventsByApplication: Record<string, StageHistoryEvent[]>;
};

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * Historial completo de un candidato a través de todas sus búsquedas anteriores: un bloque
 * por cada postulación pasada (búsqueda + etapa/resultado), con sus notas y sus cambios de
 * etapa anidados debajo. Reusa los mismos componentes de solo lectura del sheet de pipeline.
 */
export function CandidateHistoryTimeline({
  applications,
  notesByApplication,
  stageEventsByApplication,
}: Props) {
  return (
    <div className="flex flex-col gap-5">
      {applications.map((app) => (
        <section
          key={app.id}
          className="rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3.5">
            <div className="min-w-0">
              <Link
                href={`/jobs/${app.jobId}/pipeline`}
                className="truncate font-semibold text-text hover:text-primary"
              >
                {app.jobTitle}
              </Link>
              <p className="text-xs text-muted">Postulado el {dateFmt.format(app.createdAt)}</p>
            </div>
            <Badge variant={app.stage}>{STAGE_LABELS[app.stage]}</Badge>
          </div>

          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-col gap-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-label">
                Historial de etapa
              </h3>
              <StageHistoryTimeline events={stageEventsByApplication[app.id] ?? []} />
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-label">
                Notas internas
              </h3>
              <NoteList notes={notesByApplication[app.id] ?? []} />
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
