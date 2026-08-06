"use client";

import { useState } from "react";
import { ScheduleInterviewDialog } from "@/features/recruiter/applications/ui/ScheduleInterviewDialog";
import type { InterviewRow } from "@/features/recruiter/interviews/domain/agendar-entrevista";
import type { TeamMemberOption } from "@/features/recruiter/interviews/ui/InterviewForm";
import type { ShortlistCandidateWithFeedback } from "../data/shortlists.queries";
import { ShortlistCandidateRows } from "./ShortlistCandidateRows";
import { ShortlistCandidateDetailLoader } from "./ShortlistCandidateDetailLoader";
import { CommentComposer } from "./CommentComposer";

type Props = {
  shortlistId: string;
  jobId: string;
  jobTitle: string;
  candidates: ShortlistCandidateWithFeedback[];
  teamMembers: TeamMemberOption[];
  interviewsByApplication: Record<string, InterviewRow[]>;
};

/** Lista clickeable + sheet de detalle unificado, para la vista del recruiter — con el
 *  composer de comentarios y el enganche a "Agendar entrevista" que no tienen el Cliente ni
 *  el Hiring Manager (ellos solo piden, el recruiter agenda de verdad). */
export function ShortlistCardCandidates({
  shortlistId,
  jobId,
  jobTitle,
  candidates,
  teamMembers,
  interviewsByApplication,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [schedulingApplicationId, setSchedulingApplicationId] = useState<string | null>(null);
  const [scheduleDefault, setScheduleDefault] = useState<Date | undefined>(undefined);

  const selectedRow = candidates.find((c) => c.shortlistCandidateId === selectedId) ?? null;

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
            commentComposerSlot: (
              <CommentComposer
                shortlistCandidateId={data.shortlistCandidateId}
                shortlistId={shortlistId}
                jobId={jobId}
              />
            ),
            scheduleSlot: data.interviewRequestedAt && selectedRow && (
              <button
                type="button"
                onClick={() => {
                  setSchedulingApplicationId(selectedRow.applicationId);
                  setScheduleDefault(
                    data.interviewRequestedSlots?.[0] ? new Date(data.interviewRequestedSlots[0]) : undefined,
                  );
                }}
                className="w-fit rounded-[var(--radius)] bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
              >
                Agendar entrevista
              </button>
            ),
          })}
        />
      )}

      <ScheduleInterviewDialog
        applicationId={schedulingApplicationId}
        jobId={jobId}
        candidateName={selectedRow?.fullName ?? ""}
        interviews={schedulingApplicationId ? (interviewsByApplication[schedulingApplicationId] ?? []) : []}
        teamMembers={teamMembers}
        defaultScheduledAt={scheduleDefault}
        onClose={() => setSchedulingApplicationId(null)}
      />
    </>
  );
}
