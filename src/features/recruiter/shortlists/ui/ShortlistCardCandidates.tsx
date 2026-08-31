"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/lib/toast";
import { ScheduleInterviewDialog } from "@/features/recruiter/applications/ui/ScheduleInterviewDialog";
import type { InterviewRow } from "@/features/recruiter/interviews/domain/agendar-entrevista";
import type { JobStageOption } from "@/features/recruiter/interviews/data/interviews.queries";
import type { TeamMemberOption } from "@/features/recruiter/interviews/ui/InterviewForm";
import type { ShortlistCandidateWithFeedback } from "../data/shortlists.queries";
import { quitarCandidatoDeShortlistAction } from "../actions";
import { ShortlistCandidateRows } from "./ShortlistCandidateRows";
import { ShortlistCandidateDetailLoader } from "./ShortlistCandidateDetailLoader";
import { CommentComposer } from "./CommentComposer";

type Props = {
  shortlistId: string;
  jobId: string;
  jobTitle: string;
  candidates: ShortlistCandidateWithFeedback[];
  jobStages: JobStageOption[];
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
  jobStages,
  teamMembers,
  interviewsByApplication,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [schedulingApplicationId, setSchedulingApplicationId] = useState<string | null>(null);
  const [scheduleDefault, setScheduleDefault] = useState<Date | undefined>(undefined);
  const [toRemove, setToRemove] = useState<ShortlistCandidateWithFeedback | null>(null);
  const [removing, startRemoving] = useTransition();

  const selectedRow = candidates.find((c) => c.shortlistCandidateId === selectedId) ?? null;

  function confirmRemove() {
    if (!toRemove) return;
    const candidate = toRemove;
    startRemoving(async () => {
      const fd = new FormData();
      fd.set("shortlistCandidateId", candidate.shortlistCandidateId);
      fd.set("jobId", jobId);
      const res = await quitarCandidatoDeShortlistAction({}, fd);
      setToRemove(null);
      if (res.error) {
        toast({ message: res.error, variant: "danger" });
        return;
      }
      toast({ message: `${candidate.fullName} salió de la shortlist.`, variant: "success" });
      router.refresh();
    });
  }

  return (
    <>
      <ShortlistCandidateRows
        candidates={candidates}
        onSelect={setSelectedId}
        onRemove={setToRemove}
      />

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
        jobStages={jobStages}
        teamMembers={teamMembers}
        defaultScheduledAt={scheduleDefault}
        candidateEmail={selectedRow?.email ?? null}
        onClose={() => setSchedulingApplicationId(null)}
      />

      <Dialog
        open={toRemove !== null}
        onClose={() => setToRemove(null)}
        side="center"
        title="Quitar de la shortlist"
        className="max-w-sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text">
            {toRemove?.fullName} sale de esta shortlist, pero{" "}
            <span className="font-semibold">sigue en la búsqueda y en el pipeline</span>.
          </p>
          {(toRemove?.feedbackDecision || toRemove?.interviewRequestedAt) && (
            <p className="rounded-[var(--radius)] border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-text/80">
              El feedback que la empresa dejó sobre este candidato en esta tanda se pierde.
            </p>
          )}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setToRemove(null)}
              className="rounded text-sm font-semibold text-muted outline-none transition-colors hover:text-text focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              Cancelar
            </button>
            <Button variant="destructive" loading={removing} onClick={confirmRemove}>
              Quitar
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
