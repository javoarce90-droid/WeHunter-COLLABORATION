"use client";

import { useActionState, useState } from "react";
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
  TYPE_LABELS,
  LOCATION_MAX_LENGTH,
  INTERVIEW_NOTES_MAX_LENGTH,
  type InterviewMode,
} from "../schema";
import type { InterviewRow } from "../domain/agendar-entrevista";
import type { JobStageOption } from "../data/interviews.queries";
import { encontrarSolapamientos, type SolapamientoCandidate } from "../domain/detectar-solapamiento";
import {
  toLocalDateTimeInputValue,
  todayDateTimeInputValue,
  localDateTimeValueToISOString,
} from "@/lib/date";

const timeFmt = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" });

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
  /** Sugerencia inicial de fecha/hora al agendar (ej. el horario que propuso el Cliente/HM
   *  al pedir entrevista desde el shortlist) — editable, no se usa si `interview` ya trae la suya. */
  defaultScheduledAt?: Date;
  /** Etapas del pipeline de esta búsqueda — pueblan el selector "Tipo" (ya no es un enum
   *  fijo, ver schema.ts). */
  jobStages: JobStageOption[];
  teamMembers: TeamMemberOption[];
  /** Email del candidato de esta postulación — se invita automáticamente a Calendar; se
   *  muestra acá editable por si hay que corregirlo puntualmente para esta entrevista. */
  candidateEmail?: string | null;
  /** Otras entrevistas ya agendadas (de toda la org) contra las que avisar solapamientos de
   *  horario mientras se elige fecha/hora — nunca bloquea el submit, solo avisa. Si no viene,
   *  no se chequea (el caller no tenía la lista a mano). */
  existingInterviews?: SolapamientoCandidate[];
  onDone: () => void;
};

export function InterviewForm({
  applicationId,
  jobId,
  interview,
  defaultScheduledAt,
  jobStages,
  teamMembers,
  candidateEmail,
  existingInterviews,
  onDone,
}: Props) {
  const isEdit = Boolean(interview);
  const [mode, setMode] = useState<InterviewMode>(interview?.mode ?? "remote");
  const [scheduledAtLocal, setScheduledAtLocal] = useState(
    interview
      ? toLocalDateTimeInputValue(interview.scheduledAt)
      : defaultScheduledAt
        ? toLocalDateTimeInputValue(defaultScheduledAt)
        : "",
  );

  // Aviso de solapamiento (nunca bloquea): recalcula en cada render con el valor tipeado, no
  // hace falta debounce — es una comparación en memoria contra una lista ya cargada.
  const scheduledAtDate = scheduledAtLocal ? new Date(scheduledAtLocal) : null;
  const conflicts =
    scheduledAtDate && !isNaN(scheduledAtDate.getTime()) && existingInterviews
      ? encontrarSolapamientos(scheduledAtDate, existingInterviews, interview?.id)
      : [];

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
        {/* El input visible NO manda `scheduledAt` directo — el valor "naive" de un
            datetime-local no lleva huso horario, y parsearlo en el servidor lo interpreta con
            el huso del SERVIDOR, no el del usuario (bug real: en prod corre la hora ~3hs).
            Se normaliza a ISO acá, en el navegador, y eso es lo que viaja. */}
        <input
          type="datetime-local"
          required
          // Sin min si ya es una entrevista pasada (editar notas/estado de algo que ya
          // sucedió no debería exigir mover la fecha para adelante).
          min={
            interview && interview.scheduledAt < new Date() ? undefined : todayDateTimeInputValue()
          }
          value={scheduledAtLocal}
          onChange={(e) => setScheduledAtLocal(e.target.value)}
          className="rounded-[var(--radius)] border border-border bg-bg px-2 py-1 text-xs text-text outline-none focus:border-primary"
        />
        <input type="hidden" name="scheduledAt" value={localDateTimeValueToISOString(scheduledAtLocal) ?? ""} />
      </label>

      {conflicts.length > 0 && (
        <p className="flex items-start gap-1.5 rounded-[var(--radius)] bg-[#FEF3C7] px-2 py-1.5 text-[11px] font-medium text-[#92400E]">
          <svg width="12" height="12" className="mt-0.5 shrink-0" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
            <path d="M6 0.5 11.5 11h-11L6 .5Zm-.6 4v3h1.2v-3H5.4Zm0 4v1.2h1.2V8.5H5.4Z" />
          </svg>
          <span>
            Se superpone con {conflicts.length === 1 ? "otra entrevista" : `${conflicts.length} entrevistas`}
            {": "}
            {conflicts
              .map((c) => `${c.candidateName} a las ${timeFmt.format(c.scheduledAt)}`)
              .join(", ")}
            . Podés agendar igual.
          </span>
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
          Modalidad
          <select
            name="mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as InterviewMode)}
            className="rounded-[var(--radius)] border border-border bg-bg px-2 py-1 text-xs text-text outline-none focus:border-primary"
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
            defaultValue={interview?.type ?? jobStages[0]?.name ?? ""}
            className="rounded-[var(--radius)] border border-border bg-bg px-2 py-1 text-xs text-text outline-none focus:border-primary"
          >
            {jobStages.map((stage) => (
              <option key={stage.id} value={stage.name}>
                {stage.name}
              </option>
            ))}
            {/* Entrevista existente cuyo tipo no matchea ninguna etapa actual (etapa
                renombrada/borrada, o valor viejo del enum fijo que había antes) — se deja
                como opción para no perderlo silenciosamente al editar. */}
            {interview && !jobStages.some((s) => s.name === interview.type) && (
              <option value={interview.type}>
                {TYPE_LABELS[interview.type] ?? interview.type}
              </option>
            )}
          </select>
        </label>
      </div>

      {isEdit && (
        <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
          Estado
          <select
            name="status"
            defaultValue={interview?.status ?? "scheduled"}
            className="rounded-[var(--radius)] border border-border bg-bg px-2 py-1 text-xs text-text outline-none focus:border-primary"
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
          className="rounded-[var(--radius)] border border-border bg-bg px-2 py-1 text-xs text-text outline-none focus:border-primary"
        />
        {!isEdit && mode === "remote" && (
          <span className="font-normal text-muted/80">
            Si lo dejás vacío, generamos un Google Meet automático (necesita tu Google Calendar conectado).
          </span>
        )}
      </label>

      <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
        Email del candidato
        <input
          type="email"
          name="candidateEmail"
          defaultValue={candidateEmail ?? ""}
          placeholder="candidato@email.com"
          className="rounded-[var(--radius)] border border-border bg-bg px-2 py-1 text-xs text-text outline-none focus:border-primary"
        />
        <span className="font-normal text-muted/80">Se invita automáticamente a este mail.</span>
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
          className="rounded-[var(--radius)] border border-border bg-bg px-2 py-1 text-xs text-text outline-none focus:border-primary"
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
          className="resize-none rounded-[var(--radius)] border border-border bg-bg px-2 py-1 text-xs text-text outline-none focus:border-primary"
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
