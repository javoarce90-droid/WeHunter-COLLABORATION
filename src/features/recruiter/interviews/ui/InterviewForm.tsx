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
  INTERVIEW_TYPES,
  MODE_LABELS,
  STATUS_LABELS,
  TYPE_LABELS,
  LOCATION_MAX_LENGTH,
  INTERVIEW_NOTES_MAX_LENGTH,
} from "../schema";
import type { InterviewRow } from "../domain/agendar-entrevista";

export type TeamMemberOption = {
  profileId: string;
  name: string | null;
  email: string;
};

type Props = {
  applicationId: string;
  jobId: string;
  /** Si viene, el form edita esa entrevista; si no, agenda una nueva. */
  interview?: InterviewRow;
  teamMembers: TeamMemberOption[];
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

export function InterviewForm({ applicationId, jobId, interview, teamMembers, onDone }: Props) {
  const isEdit = Boolean(interview);

  const teamEmailSet = new Set(teamMembers.map((m) => m.email.toLowerCase()));
  const currentParticipants = interview?.participantEmails ?? [];
  const currentTeamEmails = new Set(
    currentParticipants.filter((e) => teamEmailSet.has(e.toLowerCase())),
  );
  const currentExternalEmails = currentParticipants.filter(
    (e) => !teamEmailSet.has(e.toLowerCase()),
  );

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

      <div className="grid grid-cols-2 gap-2">
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

        <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
          Tipo
          <select
            name="type"
            defaultValue={interview?.type ?? "screening"}
            className="rounded-[var(--radius)] border border-border bg-surface px-2 py-1 text-xs text-text outline-none focus:border-primary"
          >
            {INTERVIEW_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
      </div>

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

      {teamMembers.length > 0 && (
        <fieldset className="flex flex-col gap-1">
          <legend className="text-[11px] font-medium text-muted">Participantes del equipo</legend>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {teamMembers.map((m) => (
              <label key={m.profileId} className="flex items-center gap-1.5 text-[11px] text-text">
                <input
                  type="checkbox"
                  name="participantEmails"
                  value={m.email}
                  defaultChecked={currentTeamEmails.has(m.email)}
                  className="accent-primary"
                />
                {m.name ?? m.email}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
        Otros participantes (emails)
        <input
          type="text"
          name="externalEmails"
          defaultValue={currentExternalEmails.join(", ")}
          placeholder="cliente@empresa.com, otro@ejemplo.com"
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
