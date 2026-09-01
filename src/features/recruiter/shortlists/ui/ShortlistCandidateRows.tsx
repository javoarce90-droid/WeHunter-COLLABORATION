"use client";

import { Badge } from "@/components/ui/badge";
import { STAGE_LABELS } from "@/features/recruiter/applications/schema";
import type { ApplicationStage } from "@/features/recruiter/applications/schema";
import { FEEDBACK_META } from "@/features/company/shortlist-review/ui/feedback-meta";
import type { ShortlistCandidateWithFeedback } from "../data/shortlists.queries";

type Props = {
  candidates: ShortlistCandidateWithFeedback[];
  onSelect: (shortlistCandidateId: string) => void;
  /** Solo el recruiter en la card de su shortlist lo pasa — la bandeja del HM no. */
  onRemove?: (candidate: ShortlistCandidateWithFeedback) => void;
};

/** Filas compactas de un shortlist — usadas tanto por la bandeja del Hiring Manager como
 *  por la vista del recruiter. Clic abre el sheet de detalle unificado; el recruiter además
 *  ve un preview del feedback del cliente y puede quitar al candidato de la tanda. */
export function ShortlistCandidateRows({ candidates, onSelect, onRemove }: Props) {
  return (
    <ul className="flex flex-col gap-2">
      {candidates.map((c) => {
        const fb = c.feedbackDecision ? FEEDBACK_META[c.feedbackDecision] : null;
        const slotCount = c.interviewRequestedAt ? (c.interviewRequestedSlots?.length ?? 0) : 0;
        return (
          <li
            key={c.shortlistCandidateId}
            className="flex items-stretch overflow-hidden rounded-[var(--radius)] border border-border bg-surface transition-colors hover:border-primary/40"
          >
            <button
              type="button"
              onClick={() => onSelect(c.shortlistCandidateId)}
              className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-bg"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-text">{c.fullName}</p>
                {c.email && <p className="truncate text-xs text-muted">{c.email}</p>}
                {c.feedbackComment && (
                  <p className="mt-1 truncate text-xs italic text-text/70">
                    “{c.feedbackComment}”
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                <Badge variant={c.stage as ApplicationStage}>
                  {c.stageName ?? STAGE_LABELS[c.stage as ApplicationStage]}
                </Badge>
                {fb ? (
                  <Badge variant={fb.variant}>{fb.label}</Badge>
                ) : (
                  <Badge variant="muted">Sin feedback</Badge>
                )}
                {slotCount > 0 ? (
                  <Badge variant="warning">
                    Propuso {slotCount} horario{slotCount !== 1 ? "s" : ""}
                  </Badge>
                ) : (
                  c.interviewRequestedAt && <Badge variant="warning">Pidió entrevista</Badge>
                )}
              </div>
            </button>

            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(c)}
                title="Quitar de la shortlist (no sale de la búsqueda)"
                className="shrink-0 border-l border-border px-3 text-xs font-semibold text-muted outline-none transition-colors hover:bg-danger/5 hover:text-danger focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-danger)]"
              >
                Quitar
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
