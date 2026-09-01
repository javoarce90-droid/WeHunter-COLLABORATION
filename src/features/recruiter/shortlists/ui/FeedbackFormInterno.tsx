"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { registrarFeedbackInternoAction } from "../actions";
import type { FeedbackInternoState } from "../actions";
import { FEEDBACK_DECISIONS } from "@/features/company/shortlist-review/domain/registrar-feedback";
import type { FeedbackDecision } from "@/features/company/shortlist-review/domain/registrar-feedback";

type Props = {
  shortlistId: string;
  shortlistCandidateId: string;
  currentDecision: FeedbackDecision | null;
  currentComment: string | null;
};

const DECISION_LABELS: Record<FeedbackDecision, string> = {
  approved: "Aprobar",
  rejected: "Rechazar",
  maybe: "Quizás",
};

const initialState: FeedbackInternoState = {};

/**
 * Feedback del Hiring Manager sobre un candidato de un shortlist compartido internamente
 * (§9). Igual al `FeedbackForm` del Cliente externo pero autoriza por sesión (sin token).
 * Decisión + comentario se mandan JUNTOS con un botón explícito "Enviar feedback" — antes
 * cada botón de decisión era un submit y el comentario se guardaba de rebote (si el HM
 * escribía un comentario y no volvía a tocar la decisión, se perdía sin aviso).
 */
export function FeedbackFormInterno({
  shortlistId,
  shortlistCandidateId,
  currentDecision,
  currentComment,
}: Props) {
  const [state, dispatch, isPending] = useActionState(
    registrarFeedbackInternoAction,
    initialState,
  );
  const [decision, setDecision] = useState<FeedbackDecision | null>(currentDecision);
  const [comment, setComment] = useState(currentComment ?? "");

  const yaRespondio = currentDecision !== null;

  return (
    <form action={dispatch} className="flex flex-col gap-3">
      <input type="hidden" name="shortlistId" value={shortlistId} />
      <input type="hidden" name="shortlistCandidateId" value={shortlistCandidateId} />
      <input type="hidden" name="decision" value={decision ?? ""} />

      <p className="text-xs font-semibold uppercase tracking-wide text-label">Tu respuesta</p>

      <div className="flex flex-wrap gap-2">
        {FEEDBACK_DECISIONS.map((d: FeedbackDecision) => {
          const selected = decision === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDecision(d)}
              aria-pressed={selected}
              className={[
                "rounded-[var(--radius)] border px-3 py-2 text-xs font-semibold transition-colors",
                selected
                  ? "border-primary bg-primary-light text-primary-hover"
                  : "border-border text-muted hover:border-primary hover:text-primary",
              ].join(" ")}
            >
              {DECISION_LABELS[d]}
            </button>
          );
        })}
      </div>

      <textarea
        name="comment"
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={2000}
        placeholder="Comentario para el equipo de reclutamiento (opcional)."
        className="w-full resize-y rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]"
      />

      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      {state.ok && (
        <p className="rounded-[var(--radius)] border border-success/30 bg-success/5 px-3 py-2 text-xs font-medium text-success">
          Tu feedback fue enviado al equipo de reclutamiento. Podés editarlo y volver a
          enviarlo mientras la búsqueda siga abierta.
        </p>
      )}

      <Button type="submit" loading={isPending} disabled={!decision} className="w-fit">
        {yaRespondio ? "Actualizar feedback" : "Enviar feedback"}
      </Button>
    </form>
  );
}
