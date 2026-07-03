"use client";

import { useActionState, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  eliminarInterviewAction,
  type InterviewActionState,
} from "../actions";
import { MODE_LABELS, STATUS_BADGE, STATUS_LABELS } from "../schema";
import type { InterviewRow } from "../domain/agendar-entrevista";
import { InterviewForm } from "./InterviewForm";

type Props = {
  applicationId: string;
  jobId: string;
  interviews: InterviewRow[];
};

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function InterviewsSection({ applicationId, jobId, interviews }: Props) {
  // null = nada abierto; "new" = form de alta; un id = editando esa entrevista.
  const [editing, setEditing] = useState<string | null>(null);

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
                  <Badge
                    variant={STATUS_BADGE[it.status]}
                    className={it.status === "cancelled" ? "line-through" : ""}
                  >
                    {STATUS_LABELS[it.status]}
                  </Badge>
                </div>
                <p className="mt-0.5 text-[11px] text-muted">{MODE_LABELS[it.mode]}</p>
                {it.location && (
                  <p className="truncate text-[11px] text-muted" title={it.location}>
                    {it.location}
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
