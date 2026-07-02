import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { STAGE_LABELS } from "@/features/recruiter/applications/schema";
import type { ApplicationStage } from "@/features/recruiter/applications/schema";
import type { SharedShortlist } from "../data/shortlist-review.data";
import { FeedbackForm } from "./FeedbackForm";

type Props = {
  token: string;
  shortlist: SharedShortlist;
};

export function SharedShortlistView({ token, shortlist }: Props) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-label">
          {shortlist.jobTitle}
        </span>
        <h1 className="font-display text-2xl font-bold text-text">{shortlist.shortlistName}</h1>
        <p className="text-sm text-muted">
          {shortlist.candidates.length} candidato
          {shortlist.candidates.length !== 1 ? "s" : ""} para tu revisión. Dejá tu feedback en
          cada uno.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {shortlist.candidates.map((c) => (
          <Card key={c.shortlistCandidateId}>
            <div className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-text">{c.fullName}</h2>
                  {c.email && <p className="truncate text-sm text-muted">{c.email}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={c.stage as ApplicationStage}>
                    {STAGE_LABELS[c.stage as ApplicationStage]}
                  </Badge>
                  {c.cvUrl && (
                    <a
                      href={`/share/${token}/cv/${c.shortlistCandidateId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-[var(--radius)] border border-border px-2.5 py-1 text-xs font-semibold text-muted transition-colors hover:border-primary hover:text-primary"
                    >
                      Ver CV
                    </a>
                  )}
                </div>
              </div>

              <FeedbackForm
                token={token}
                shortlistCandidateId={c.shortlistCandidateId}
                currentDecision={c.feedbackDecision}
                currentComment={c.feedbackComment}
              />
            </div>
          </Card>
        ))}
      </div>

      <footer className="text-center text-xs text-muted">
        Compartido vía WeHunter. Solo ves los candidatos seleccionados para esta búsqueda.
      </footer>
    </div>
  );
}
