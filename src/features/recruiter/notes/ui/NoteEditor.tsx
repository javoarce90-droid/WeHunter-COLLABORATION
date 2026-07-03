"use client";

import { useActionState, useRef, useState, useEffect } from "react";
import { guardarNotaAction } from "../actions";
import type { NoteActionState } from "../actions";
import { NOTE_MAX_LENGTH } from "../schema";

type Props = {
  applicationId: string;
  jobId: string;
  initialNotes: string | null;
};

export function NoteEditor({ applicationId, jobId, initialNotes }: Props) {
  const [open, setOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [state, dispatch, isPending] = useActionState<NoteActionState, FormData>(
    async (prev, formData) => {
      const result = await guardarNotaAction(prev, formData);
      if (!result.error) setOpen(false);
      return result;
    },
    {},
  );

  // Foco automático al abrir
  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 w-full rounded-[var(--radius)] border border-dashed border-border px-2.5 py-1.5 text-left text-xs text-muted transition-colors hover:border-primary/50 hover:text-primary"
      >
        {initialNotes ? (
          <span className="line-clamp-2">{initialNotes}</span>
        ) : (
          <span className="italic">+ Agregar nota interna…</span>
        )}
      </button>
    );
  }

  return (
    <form action={dispatch} className="mt-2 flex flex-col gap-1.5">
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="jobId" value={jobId} />
      <textarea
        ref={textareaRef}
        name="notes"
        defaultValue={initialNotes ?? ""}
        maxLength={NOTE_MAX_LENGTH}
        rows={4}
        placeholder="Nota interna — no visible para la empresa ni el candidato."
        className="w-full resize-none rounded-[var(--radius)] border border-border bg-surface px-3 py-2 text-xs text-text outline-none transition-colors focus:border-primary"
      />
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-semibold text-muted hover:text-text"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-[var(--radius)] bg-primary px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {isPending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
