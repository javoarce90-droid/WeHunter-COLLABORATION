"use client";

import { useState } from "react";
import type { ShortlistCandidateWithFeedback } from "../data/shortlists.queries";
import { ShortlistCandidateRows } from "./ShortlistCandidateRows";
import { ShortlistCandidateDetailLoader } from "./ShortlistCandidateDetailLoader";
import { FeedbackFormInterno } from "./FeedbackFormInterno";
import { RequestInterviewFormInterno } from "./RequestInterviewFormInterno";

type Props = {
  shortlistId: string;
  jobTitle: string;
  candidates: ShortlistCandidateWithFeedback[];
};

/** Bandeja del Hiring Manager: mismo sheet de detalle que ve el Cliente externo, pero
 *  autenticado (sin token) — feedback y pedido de entrevista vía sesión. */
export function HmShortlistCandidateList({ shortlistId, jobTitle, candidates }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <>
      <ShortlistCandidateRows candidates={candidates} onSelect={setSelectedId} />

      {selectedId && (
        <ShortlistCandidateDetailLoader
          key={selectedId}
          shortlistCandidateId={selectedId}
          jobTitle={jobTitle}
          onClose={() => setSelectedId(null)}
          buildSlots={(data) => ({
            decisionSlot: (
              <div className="flex flex-col gap-4">
                <FeedbackFormInterno
                  shortlistId={shortlistId}
                  shortlistCandidateId={data.shortlistCandidateId}
                  currentDecision={data.feedbackDecision}
                  currentComment={data.feedbackComment}
                />
                <RequestInterviewFormInterno
                  shortlistCandidateId={data.shortlistCandidateId}
                  requested={data.interviewRequestedAt !== null}
                />
              </div>
            ),
          })}
        />
      )}
    </>
  );
}
