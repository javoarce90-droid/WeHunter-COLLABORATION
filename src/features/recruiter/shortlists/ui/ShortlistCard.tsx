import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { STAGE_LABELS } from "@/features/recruiter/applications/schema";
import type { ApplicationStage } from "@/features/recruiter/applications/schema";
import type { FeedbackDecision } from "@/features/company/shortlist-review/domain/registrar-feedback";
import type {
  ShortlistCandidateWithFeedback,
  ShareRow,
} from "../data/shortlists.queries";
import { ShareControls } from "./ShareControls";

type Props = {
  shortlistId: string;
  jobId: string;
  name: string;
  candidates: ShortlistCandidateWithFeedback[];
  shares: ShareRow[];
};

const FEEDBACK_META: Record<
  FeedbackDecision,
  { label: string; variant: "success" | "danger" | "warning" }
> = {
  approved: { label: "Aprobado", variant: "success" },
  rejected: { label: "Rechazado", variant: "danger" },
  maybe: { label: "Quizás", variant: "warning" },
};

export function ShortlistCard({ shortlistId, jobId, name, candidates, shares }: Props) {
  return (
    <Card>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-text">{name}</h3>
          <span className="text-xs text-muted">
            {candidates.length} candidato{candidates.length !== 1 ? "s" : ""}
          </span>
        </div>

        <ul className="flex flex-col gap-1.5">
          {candidates.map((c) => {
            const fb = c.feedbackDecision ? FEEDBACK_META[c.feedbackDecision] : null;
            return (
              <li
                key={c.shortlistCandidateId}
                className="flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-border px-3 py-2 text-sm"
              >
                <span className="flex-1 truncate text-text">{c.fullName}</span>
                <Badge variant={c.stage as ApplicationStage}>
                  {STAGE_LABELS[c.stage as ApplicationStage]}
                </Badge>
                {fb ? (
                  <Badge variant={fb.variant}>{fb.label}</Badge>
                ) : (
                  <Badge variant="muted">Sin feedback</Badge>
                )}
                {c.feedbackComment && (
                  <p className="w-full text-xs italic text-muted">“{c.feedbackComment}”</p>
                )}
              </li>
            );
          })}
        </ul>

        <ShareControls shortlistId={shortlistId} jobId={jobId} shares={shares} />
      </div>
    </Card>
  );
}
