"use client";

import { useActionState, useState } from "react";
import { solicitarEntrevistaInternoAction } from "../actions";
import type { SolicitarEntrevistaInternoState } from "../actions";
import { MAX_INTERVIEW_SLOTS } from "@/features/company/shortlist-review/domain/interview-slots";

type Props = {
  shortlistCandidateId: string;
  requested: boolean;
};

const initialState: SolicitarEntrevistaInternoState = {};

/** Igual al `RequestInterviewForm` del Cliente externo, pero sin token: autoriza por
 *  sesión (ver `solicitarEntrevistaInterno`). */
export function RequestInterviewFormInterno({ shortlistCandidateId, requested }: Props) {
  const [state, dispatch, isPending] = useActionState(solicitarEntrevistaInternoAction, initialState);
  const [slotCount, setSlotCount] = useState(1);

  if (requested) {
    return <p className="text-sm font-semibold text-primary">Entrevista solicitada.</p>;
  }

  return (
    <form action={dispatch} className="flex flex-col gap-2">
      <input type="hidden" name="shortlistCandidateId" value={shortlistCandidateId} />

      <p className="text-xs font-semibold uppercase tracking-wide text-label">
        Solicitar entrevista
      </p>
      <p className="text-xs text-muted">Proponé hasta {MAX_INTERVIEW_SLOTS} horarios tentativos.</p>

      <div className="flex flex-col gap-2">
        {Array.from({ length: slotCount }, (_, i) => (
          <input
            key={i}
            type="datetime-local"
            name="slots"
            required={i === 0}
            className="rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]"
          />
        ))}
      </div>

      {slotCount < MAX_INTERVIEW_SLOTS && (
        <button
          type="button"
          onClick={() => setSlotCount((n) => n + 1)}
          className="w-fit text-xs font-semibold text-primary hover:text-primary-hover"
        >
          + Agregar otra opción
        </button>
      )}

      {state.error && <p className="text-xs text-danger">{state.error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-fit rounded-[var(--radius)] border border-primary bg-primary-light px-3 py-2 text-sm font-semibold text-primary-hover transition-colors hover:bg-primary hover:text-white disabled:opacity-50"
      >
        {isPending ? "Enviando…" : "Solicitar entrevista"}
      </button>
    </form>
  );
}
