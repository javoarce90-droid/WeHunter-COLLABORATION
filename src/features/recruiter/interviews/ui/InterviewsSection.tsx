"use client";

import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  eliminarInterviewAction,
  type InterviewActionState,
} from "../actions";
import { MODE_LABELS, STATUS_BADGE, STATUS_LABELS, TYPE_BADGE, TYPE_LABELS } from "../schema";
import type { InterviewRow } from "../domain/agendar-entrevista";
import type { JobStageOption } from "../data/interviews.queries";
import { InterviewForm, type TeamMemberOption } from "./InterviewForm";
import { InterviewReportButton } from "@/features/recruiter/interview-reports/ui/InterviewReportButton";

type Props = {
  applicationId: string;
  jobId: string;
  interviews: InterviewRow[];
  jobStages: JobStageOption[];
  teamMembers: TeamMemberOption[];
  /** Sugerencia inicial al agendar (ver `InterviewForm`) — cuando viene, el form de alta
   *  arranca abierto de una (no hace falta el clic extra en "+ Agendar entrevista…"). */
  defaultScheduledAt?: Date;
  /** Email del candidato de esta postulación (ver `InterviewForm`). */
  candidateEmail?: string | null;
  /** Nombre del candidato — solo para el título del diálogo de informe de entrevista. */
  candidateName?: string;
};

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function InterviewsSection({
  applicationId,
  jobId,
  interviews,
  jobStages,
  teamMembers,
  defaultScheduledAt,
  candidateEmail,
  candidateName,
}: Props) {
  // null = nada abierto; "new" = form de alta; un id = editando esa entrevista.
  // Con una sugerencia de horario, arranca directo en "new" (venís de "Agendar entrevista"
  // en el shortlist, no de recorrer la lista).
  const [editing, setEditing] = useState<string | null>(defaultScheduledAt ? "new" : null);

  return (
    <div className="mt-2 border-t border-border pt-2">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-label">
        Entrevistas
      </p>

      {interviews.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {interviews.map((it) =>
            editing === it.id ? (
              <li key={it.id}>
                <InterviewForm
                  applicationId={applicationId}
                  jobId={jobId}
                  interview={it}
                  jobStages={jobStages}
                  teamMembers={teamMembers}
                  candidateEmail={candidateEmail}
                  onDone={() => setEditing(null)}
                />
              </li>
            ) : (
              <li
                key={it.id}
                className="rounded-[var(--radius)] border border-border bg-surface px-2 py-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-text">
                    {dateFormatter.format(it.scheduledAt)}
                  </span>
                  <div className="flex items-center gap-1">
                    <Badge variant={TYPE_BADGE[it.type] ?? "blue"}>
                      {TYPE_LABELS[it.type] ?? it.type}
                    </Badge>
                    <Badge
                      variant={STATUS_BADGE[it.status]}
                      className={it.status === "cancelled" ? "line-through" : ""}
                    >
                      {STATUS_LABELS[it.status]}
                    </Badge>
                  </div>
                </div>
                <p className="mt-0.5 text-[11px] text-muted">{MODE_LABELS[it.mode]}</p>
                {it.location &&
                  (it.location.startsWith("http") ? (
                    <a
                      href={it.location}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="block truncate text-[11px] text-primary hover:text-primary-hover hover:underline"
                      title={it.location}
                    >
                      {it.location}
                    </a>
                  ) : (
                    <p className="truncate text-[11px] text-muted" title={it.location}>
                      {it.location}
                    </p>
                  ))}
                {it.googleEventId && (
                  <p className="text-[11px] text-muted">📅 Sincronizada con Google Calendar</p>
                )}
                {it.googleSyncError && (
                  <p className="text-[11px] text-danger" title={it.googleSyncError}>
                    No se pudo sincronizar con Google Calendar
                  </p>
                )}
                <div className="mt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(it.id)}
                    className="text-[11px] font-semibold text-muted hover:text-primary"
                  >
                    Editar
                  </button>
                  <DeleteButton interviewId={it.id} jobId={jobId} />
                  <InterviewReportButton
                    interviewId={it.id}
                    candidateName={candidateName ?? "el candidato"}
                    scheduledAt={it.scheduledAt}
                    status={it.status}
                    variant="link"
                  />
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {editing === "new" ? (
        <InterviewForm
          applicationId={applicationId}
          jobId={jobId}
          jobStages={jobStages}
          teamMembers={teamMembers}
          defaultScheduledAt={defaultScheduledAt}
          candidateEmail={candidateEmail}
          onDone={() => setEditing(null)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="mt-1.5 w-full rounded-[var(--radius)] border border-dashed border-border px-2.5 py-1.5 text-left text-xs italic text-muted transition-colors hover:border-primary/50 hover:text-primary"
        >
          + Agendar entrevista…
        </button>
      )}
    </div>
  );
}

function DeleteButton({ interviewId, jobId }: { interviewId: string; jobId: string }) {
  const [state, dispatch, isPending] = useActionState<InterviewActionState, FormData>(
    (prev, formData) => eliminarInterviewAction(prev, formData),
    {},
  );

  return (
    <form action={dispatch} className="inline">
      <input type="hidden" name="interviewId" value={interviewId} />
      <input type="hidden" name="jobId" value={jobId} />
      <button
        type="submit"
        disabled={isPending}
        className="text-[11px] font-semibold text-muted hover:text-danger disabled:opacity-50"
        title={state.error ?? undefined}
      >
        {isPending ? "Eliminando…" : "Eliminar"}
      </button>
    </form>
  );
}
