"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { moverEtapaAction } from "../actions";
import { APPLICATION_STAGES, STAGE_LABELS } from "../schema";
import type { ApplicationStage } from "../schema";
import type { ApplicationWithCandidate } from "../data/applications.queries";
import { NoteEditor } from "@/features/recruiter/notes/ui/NoteEditor";
import { InterviewsSection } from "@/features/recruiter/interviews/ui/InterviewsSection";
import type { InterviewRow } from "@/features/recruiter/interviews/domain/agendar-entrevista";

type Props = {
  application: ApplicationWithCandidate;
  interviews: InterviewRow[];
};

const TERMINAL: ApplicationStage[] = ["hired", "rejected"];

export function PipelineCard({ application, interviews }: Props) {
  const [state, dispatch, isPending] = useActionState(moverEtapaAction, {});

  const isTerminal = TERMINAL.includes(application.stage);
  const nextStages = APPLICATION_STAGES.filter(
    (s) => s !== application.stage && !TERMINAL.includes(application.stage),
  );

  return (
    <Card>
      <div className="p-3">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-text">
            {application.candidate.fullName}
          </p>
          <Badge variant={application.stage}>{STAGE_LABELS[application.stage]}</Badge>
        </div>
        {application.candidate.email && (
          <p className="mb-2 truncate text-xs text-muted">{application.candidate.email}</p>
        )}

        {/* Mover de etapa */}
        {!isTerminal && (
          <div className="flex flex-wrap gap-1.5">
            {nextStages.map((stage) => (
              <form key={stage} action={dispatch}>
                <input type="hidden" name="applicationId" value={application.id} />
                <input type="hidden" name="newStage" value={stage} />
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  → {STAGE_LABELS[stage]}
                </button>
              </form>
            ))}
          </div>
        )}

        {state.error && (
          <p className="mt-1.5 text-xs text-red-600">{state.error}</p>
        )}

        <NoteEditor
          applicationId={application.id}
          jobId={application.jobId}
          initialNotes={application.notes}
        />

        <InterviewsSection
          applicationId={application.id}
          jobId={application.jobId}
          interviews={interviews}
        />
      </div>
    </Card>
  );
}
