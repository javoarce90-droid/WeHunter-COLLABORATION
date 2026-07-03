"use client";

import { useActionState } from "react";
import {
  agendarInterviewAction,
  actualizarInterviewAction,
  type InterviewActionState,
} from "../actions";
import {
  INTERVIEW_MODES,
  INTERVIEW_STATUSES,
  MODE_LABELS,
  STATUS_LABELS,
  LOCATION_MAX_LENGTH,
  INTERVIEW_NOTES_MAX_LENGTH,
} from "../schema";
import type { InterviewRow } from "../domain/agendar-entrevista";

type Props = {
  applicationId: string;
  jobId: string;
  /** Si viene, el form edita esa entrevista; si no, agenda una nueva. */
  interview?: InterviewRow;
  onDone: () => void;
};

/** Date → "yyyy-MM-ddThh:mm" en hora local, para un <input type="datetime-local">. */
function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function InterviewForm({ applicationId, jobId, interview, onDone }: Props) {
  const isEdit = Boolean(interview);

  const [state, dispatch, isPending] = useActionState<InterviewActionState, FormData>(
    async (prev, formData) => {
      const result = isEdit
        ? await actualizarInterviewAction(prev, formData)
        : await agendarInterviewAction(prev, formData);
      if (!result.error) onDone();
      return result;
    },
    {},
  );

  return (
    <form action={dispatch} className="mt-2 flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-surface p-2.5">
      <input type="hidden" name="jobId" value={jobId} />
      {isEdit ? (
        <input type="hidden" name="interviewId" value={interview!.id} />
      ) : (
        <input type="hidden" name="applicationId" value={applicationId} />
      )}

      <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
        Fecha y hora
        <input
          type="datetime-local"
          name="scheduledAt"
          required
          defaultValue={interview ? toLocalInputValue(interview.scheduledAt) : ""}
          className="rounded-[var(--radius)] border border-border bg-surface px-2 py-1 text-xs text-text outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
        Modalidad
        <select
          name="mode"
          defaultValue={interview?.mode ?? "remote"}
          className="rounded-[var(--radius)] border border-border bg-surface px-2 py-1 text-xs text-text outline-none focus:border-primary"
        >
          {INTERVIEW_MODES.map((m) => (
            <option key={m} value={m}>
              {MODE_LABELS[m]}
            </option>
          ))}
        </select>
      </label>

      {isEdit && (
        <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
          Estado
          <select
            name="status"
            defaultValue={interview?.status ?? "scheduled"}
            className="rounded-[var(--radius)] border border-border bg-surface px-2 py-1 text-xs text-text outline-none focus:border-primary"
          >
            {INTERVIEW_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
        Lugar / link
        <input
          type="text"
          name="location"
          maxLength={LOCATION_MAX_LENGTH}
          defaultValue={interview?.location ?? ""}
          placeholder="Dirección o link de la videollamada"
          className="rounded-[var(--radius)] border border-border bg-surface px-2 py-1 text-xs text-text outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
        Notas
        <textarea
          name="notes"
          rows={2}
          maxLength={INTERVIEW_NOTES_MAX_LENGTH}
          defaultValue={interview?.notes ?? ""}
          placeholder="Notas internas (no visible para la empresa)."
          className="resize-none rounded-[var(--radius)] border border-border bg-surface px-2 py-1 text-xs text-text outline-none focus:border-primary"
        />
      </label>

      {state.error && <p className="text-xs text-danger">{state.error}</p>}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="text-xs font-semibold text-muted hover:text-text"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-[var(--radius)] bg-primary px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {isPending ? "Guardando…" : isEdit ? "Guardar" : "Agendar"}
        </button>
      </div>
    </form>
  );
}
