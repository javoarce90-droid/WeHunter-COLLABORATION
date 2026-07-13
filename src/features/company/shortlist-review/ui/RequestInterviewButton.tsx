"use client";

import { useActionState } from "react";
import { solicitarEntrevistaAction } from "../actions";
import type { RequestInterviewActionState } from "../actions";

type Props = {
  token: string;
  shortlistCandidateId: string;
  requested: boolean;
};

const initialState: RequestInterviewActionState = {};

export function RequestInterviewButton({ token, shortlistCandidateId, requested }: Props) {
  const [state, dispatch, isPending] = useActionState(solicitarEntrevistaAction, initialState);
  const done = requested || state.ok === true;

  return (
    <form action={dispatch} className="flex flex-col items-start gap-1">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="shortlistCandidateId" value={shortlistCandidateId} />
      <button
        type="submit"
        disabled={isPending || done}
        className={[
          "rounded-[var(--radius)] border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
          done
            ? "border-primary bg-primary-light text-primary-hover"
            : "border-border text-muted hover:border-primary hover:text-primary",
        ].join(" ")}
      >
        {done ? "Entrevista solicitada" : "Solicitar entrevista"}
      </button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
