"use client";

import { useActionState, useRef, useState } from "react";
import { agregarNotaAction, type NoteActionState } from "../actions";
import { NOTE_MAX_LENGTH } from "../schema";
import type { TimelineNote } from "../data/notes.queries";

type Props = {
  applicationId: string;
  jobId: string;
  notes: TimelineNote[];
};

const VISIBLE_COUNT = 3;

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Timeline de notas internas de una postulación (tabla `notes`). Lista cronológica +
 * formulario de alta. Reemplaza al editor de nota única; las notas son append-only.
 */
export function NoteTimeline({ applicationId, jobId, notes }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [state, dispatch, pending] = useActionState<NoteActionState, FormData>(
    async (prev, formData) => {
      const result = await agregarNotaAction(prev, formData);
      if (!result.error) formRef.current?.reset();
      return result;
    },
    {},
  );

  const hiddenCount = notes.length - VISIBLE_COUNT;
  const visibleNotes = expanded ? notes : notes.slice(-VISIBLE_COUNT);

  return (
    <div className="flex flex-col gap-3">
      {notes.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="self-start text-xs font-medium text-primary hover:text-primary-hover"
            >
              {expanded ? "Ver menos" : `Ver ${hiddenCount} anteriores`}
            </button>
          )}
          <ul className="flex flex-col gap-2.5">
            {visibleNotes.map((note) => (
              <li
                key={note.id}
                className="rounded-[var(--radius)] border border-border bg-bg px-3 py-2"
              >
                <div className="mb-0.5 flex items-center justify-between gap-2 text-[11px] text-muted">
                  <span className="font-semibold text-text/70">
                    {note.authorName ?? "Equipo"}
                  </span>
                  <span className="tabular-nums">{dateFmt.format(note.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-text">{note.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form ref={formRef} action={dispatch} className="flex flex-col gap-1.5">
        <input type="hidden" name="applicationId" value={applicationId} />
        <input type="hidden" name="jobId" value={jobId} />
        <textarea
          name="body"
          rows={3}
          maxLength={NOTE_MAX_LENGTH}
          placeholder="Agregá una nota interna — no visible para la empresa ni el candidato."
          className="w-full resize-none rounded-[var(--radius)] border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]"
        />
        {state.error && <p className="text-xs text-danger">{state.error}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="rounded-[var(--radius)] bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {pending ? "Guardando…" : "Agregar nota"}
          </button>
        </div>
      </form>
    </div>
  );
}
