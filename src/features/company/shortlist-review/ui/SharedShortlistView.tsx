"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { STAGE_LABELS } from "@/features/recruiter/applications/schema";
import type { ApplicationStage } from "@/features/recruiter/applications/schema";
import type { SharedShortlist, SharedCandidate } from "../data/shortlist-review.data";
import type { ShortlistCandidateDetailData } from "../domain/shortlist-candidate-detail";
import { ShortlistCandidateDetailSheet } from "./ShortlistCandidateDetailSheet";
import { FeedbackForm } from "./FeedbackForm";
import { RequestInterviewForm } from "./RequestInterviewForm";
import { FEEDBACK_META } from "./feedback-meta";

type Props = {
  token: string;
  shortlist: SharedShortlist;
};

function toDetailData(c: SharedCandidate, token: string): ShortlistCandidateDetailData {
  return {
    shortlistCandidateId: c.shortlistCandidateId,
    fullName: c.fullName,
    email: c.email,
    phone: c.phone,
    location: c.location,
    linkedinUrl: c.linkedinUrl,
    summary: c.summary,
    skills: c.skills ?? [],
    cvHref: c.cvUrl ? `/share/${token}/cv/${c.shortlistCandidateId}` : null,
    stage: c.stage,
    feedbackDecision: c.feedbackDecision,
    feedbackComment: c.feedbackComment,
    interviewRequestedAt: c.interviewRequestedAt,
    interviewRequestedSlots: c.interviewRequestedSlots,
    experiences: c.experiences,
    education: c.education,
    languages: c.languages,
    screening: c.screening,
    interviews: c.interviews,
    comments: c.comments,
  };
}

export function SharedShortlistView({ token, shortlist }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = shortlist.candidates.find((c) => c.shortlistCandidateId === selectedId) ?? null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-label">
          {shortlist.jobTitle}
        </span>
        <h1 className="font-display text-2xl font-bold text-text">{shortlist.shortlistName}</h1>
        <p className="text-sm text-muted">
          {shortlist.candidates.length} candidato
          {shortlist.candidates.length !== 1 ? "s" : ""} para tu revisión. Abrí cada uno para
          ver su perfil completo y dejar tu feedback.
        </p>
      </header>

      <ul className="flex flex-col gap-2">
        {shortlist.candidates.map((c) => {
          const fb = c.feedbackDecision ? FEEDBACK_META[c.feedbackDecision] : null;
          return (
            <li key={c.shortlistCandidateId}>
              <button
                type="button"
                onClick={() => setSelectedId(c.shortlistCandidateId)}
                className="flex w-full items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-surface px-4 py-3 text-left shadow-[var(--shadow)] transition-colors hover:border-primary/40 hover:bg-bg"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-text">{c.fullName}</p>
                  {c.email && <p className="truncate text-xs text-muted">{c.email}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={c.stage as ApplicationStage}>
                    {STAGE_LABELS[c.stage as ApplicationStage]}
                  </Badge>
                  {fb ? <Badge variant={fb.variant}>{fb.label}</Badge> : <Badge variant="muted">Sin feedback</Badge>}
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <footer className="text-center text-xs text-muted">
        Compartido vía WeHunter. Solo ves los candidatos seleccionados para esta búsqueda.
      </footer>

      <ShortlistCandidateDetailSheet
        data={selected ? toDetailData(selected, token) : null}
        jobTitle={shortlist.jobTitle}
        onClose={() => setSelectedId(null)}
        decisionSlot={
          selected && (
            <div className="flex flex-col gap-4">
              <FeedbackForm
                token={token}
                shortlistCandidateId={selected.shortlistCandidateId}
                currentDecision={selected.feedbackDecision}
                currentComment={selected.feedbackComment}
              />
              <RequestInterviewForm
                token={token}
                shortlistCandidateId={selected.shortlistCandidateId}
                requested={selected.interviewRequestedAt !== null}
              />
            </div>
          )
        }
      />
    </div>
  );
}
