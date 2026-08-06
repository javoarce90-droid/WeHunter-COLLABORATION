"use client";

import { Badge } from "@/components/ui/badge";
import { STAGE_LABELS } from "@/features/recruiter/applications/schema";
import type { ApplicationStage } from "@/features/recruiter/applications/schema";
import { FEEDBACK_META } from "@/features/company/shortlist-review/ui/feedback-meta";
import type { ShortlistCandidateWithFeedback } from "../data/shortlists.queries";

type Props = {
  candidates: ShortlistCandidateWithFeedback[];
  onSelect: (shortlistCandidateId: string) => void;
};

/** Filas compactas de un shortlist — usadas tanto por la bandeja del Hiring Manager como
 *  por la vista del recruiter. Clic abre el sheet de detalle unificado. */
export function ShortlistCandidateRows({ candidates, onSelect }: Props) {
  return (
    <ul className="flex flex-col gap-2">
      {candidates.map((c) => {
        const fb = c.feedbackDecision ? FEEDBACK_META[c.feedbackDecision] : null;
        return (
          <li key={c.shortlistCandidateId}>
            <button
              type="button"
              onClick={() => onSelect(c.shortlistCandidateId)}
              className="flex w-full items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-surface px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-bg"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-text">{c.fullName}</p>
                {c.email && <p className="truncate text-xs text-muted">{c.email}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant={c.stage as ApplicationStage}>{STAGE_LABELS[c.stage as ApplicationStage]}</Badge>
                {fb ? (
                  <Badge variant={fb.variant}>{fb.label}</Badge>
                ) : (
                  <Badge variant="muted">Sin feedback</Badge>
                )}
                {c.interviewRequestedAt && <Badge variant="warning">Pidió entrevista</Badge>}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
