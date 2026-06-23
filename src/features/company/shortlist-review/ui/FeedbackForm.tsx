"use client";

import { useActionState } from "react";
import { registrarFeedbackAction } from "../actions";
import type { FeedbackActionState } from "../actions";
import { FEEDBACK_DECISIONS } from "../domain/registrar-feedback";
import type { FeedbackDecision } from "../domain/registrar-feedback";

type Props = {
  token: string;
  shortlistCandidateId: string;
  currentDecision: FeedbackDecision | null;
  currentComment: string | null;
};

const DECISION_LABELS: Record<FeedbackDecision, string> = {
  approved: "Aprobar",
  rejected: "Rechazar",
  maybe: "Quizás",
};

const initialState: FeedbackActionState = {};

export function FeedbackForm({
  token,
  shortlistCandidateId,
  currentDecision,
  currentComment,
}: Props) {
  const [state, dispatch, isPending] = useActionState(registrarFeedbackAction, initialState);

  return (
    <form action={dispatch} className="flex flex-col gap-2">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="shortlistCandidateId" value={shortlistCandidateId} />

      <div className="flex flex-wrap gap-2">
        {FEEDBACK_DECISIONS.map((decision: FeedbackDecision) => {
          const selected = currentDecision === decision;
          return (
            <button
              key={decision}
              type="submit"
              name="decision"
              value={decision}
              disabled={isPending}
              className={[
                "rounded-[var(--radius)] border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
                selected
                  ? "border-primary bg-primary-light text-primary-hover"
                  : "border-border text-muted hover:border-primary hover:text-primary",
              ].join(" ")}
            >
              {DECISION_LABELS[decision]}
            </button>
          );
        })}
      </div>

      <textarea
        name="comment"
        rows={2}
        defaultValue={currentComment ?? ""}
        placeholder="Comentario (opcional). Se guarda al elegir una opción."
        className="w-full resize-none rounded-[var(--radius)] border border-border bg-surface px-3 py-2 text-xs text-text outline-none transition-colors focus:border-primary"
      />

      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      {state.ok && <p className="text-xs text-green-700">Feedback guardado. ¡Gracias!</p>}
    </form>
  );
}
