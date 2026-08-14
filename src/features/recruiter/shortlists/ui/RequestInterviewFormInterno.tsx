"use client";

import { useActionState, useState } from "react";
import { solicitarEntrevistaInternoAction } from "../actions";
import type { SolicitarEntrevistaInternoState } from "../actions";
import { MAX_INTERVIEW_SLOTS } from "@/features/company/shortlist-review/domain/interview-slots";
import { todayDateTimeInputValue, localDateTimeValueToISOString } from "@/lib/date";

type Props = {
  shortlistCandidateId: string;
  requested: boolean;
};

const initialState: SolicitarEntrevistaInternoState = {};

/** Igual al `RequestInterviewForm` del Cliente externo, pero sin token: autoriza por
 *  sesión (ver `solicitarEntrevistaInterno`). */
export function RequestInterviewFormInterno({ shortlistCandidateId, requested }: Props) {
  const [state, dispatch, isPending] = useActionState(solicitarEntrevistaInternoAction, initialState);
  const [slots, setSlots] = useState<string[]>([""]);

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
        {slots.map((slot, i) => (
          <div key={i}>
            {/* El valor "naive" del datetime-local no lleva huso horario — se normaliza a ISO
                acá (navegador) antes de mandarlo, ver src/lib/date.ts. */}
            <input
              type="datetime-local"
              required={i === 0}
              min={todayDateTimeInputValue()}
              value={slot}
              onChange={(e) =>
                setSlots((prev) => prev.map((s, idx) => (idx === i ? e.target.value : s)))
              }
              className="w-full rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]"
            />
            <input type="hidden" name="slots" value={localDateTimeValueToISOString(slot) ?? ""} />
          </div>
        ))}
      </div>

      {slots.length < MAX_INTERVIEW_SLOTS && (
        <button
          type="button"
          onClick={() => setSlots((prev) => [...prev, ""])}
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
