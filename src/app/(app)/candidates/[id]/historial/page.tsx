import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import {
  listApplicationsByCandidate,
  listStageEventsByCandidate,
  type StageHistoryEvent,
} from "@/features/recruiter/applications/data/applications.queries";
import { listNotesByCandidate, type TimelineNote } from "@/features/recruiter/notes/data/notes.queries";
import { CandidateHistoryTimeline } from "@/features/recruiter/candidates/ui/CandidateHistoryTimeline";

/**
 * Pestaña Historial: participación completa del candidato a través de todas sus búsquedas
 * anteriores (notas + cambios de etapa), agrupada por búsqueda. El candidato ya está
 * validado por el layout de la ficha; esta page solo trae los datos de esta pestaña.
 */
export default async function CandidateHistorialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const [applications, notes, stageEvents] = await Promise.all([
    listApplicationsByCandidate(id, membership.organizationId),
    listNotesByCandidate(id, membership.organizationId),
    listStageEventsByCandidate(id, membership.organizationId),
  ]);

  if (applications.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-surface px-5 py-10 text-center shadow-[var(--shadow)]">
        <p className="text-sm text-muted">
          Este candidato todavía no participó en ninguna búsqueda. Postulalo desde el
          pipeline de una búsqueda para empezar su historial.
        </p>
      </div>
    );
  }

  const notesByApplication = notes.reduce<Record<string, TimelineNote[]>>((acc, n) => {
    (acc[n.applicationId] ??= []).push(n);
    return acc;
  }, {});
  const stageEventsByApplication = stageEvents.reduce<Record<string, StageHistoryEvent[]>>(
    (acc, e) => {
      (acc[e.applicationId] ??= []).push(e);
      return acc;
    },
    {},
  );

  return (
    <CandidateHistoryTimeline
      applications={applications}
      notesByApplication={notesByApplication}
      stageEventsByApplication={stageEventsByApplication}
    />
  );
}
