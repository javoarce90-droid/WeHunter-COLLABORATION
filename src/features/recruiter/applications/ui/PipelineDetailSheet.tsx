"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { NoteEditor } from "@/features/recruiter/notes/ui/NoteEditor";
import { InterviewsSection } from "@/features/recruiter/interviews/ui/InterviewsSection";
import { APPLICATION_STAGES, STAGE_LABELS } from "../schema";
import type { ApplicationStage } from "../schema";
import type { ApplicationWithCandidate } from "../data/applications.queries";
import type { InterviewRow } from "@/features/recruiter/interviews/domain/agendar-entrevista";
import { isTerminal } from "./stage-visual";

type Props = {
  application: ApplicationWithCandidate | null;
  interviews: InterviewRow[];
  onMoveStage: (applicationId: string, toStage: ApplicationStage) => void;
  onClose: () => void;
};

/**
 * Panel lateral de detalle de una postulación. Co-localiza todo lo profundo que antes
 * inflaba la card: mover de etapa, notas y entrevistas. Sheet (no modal): conserva el
 * contexto del tablero detrás (PRODUCT.md: el modal es último recurso).
 */
export function PipelineDetailSheet({ application, interviews, onMoveStage, onClose }: Props) {
  const open = application !== null;
  const terminal = application ? isTerminal(application.stage) : false;

  return (
    <Dialog open={open} onClose={onClose} side="right" className="max-w-[440px]"
      header={
        application ? (
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar name={application.candidate.fullName} size="md" />
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold text-text">
                {application.candidate.fullName}
              </p>
              <Link
                href={`/candidates/${application.candidate.id}`}
                className="text-xs font-medium text-primary hover:text-primary-hover"
              >
                Ver ficha completa →
              </Link>
            </div>
          </div>
        ) : undefined
      }
    >
      {application && (
        <div className="flex flex-col gap-5">
          {/* Etapa actual + mover */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                Etapa
              </span>
              <Badge variant={application.stage}>{STAGE_LABELS[application.stage]}</Badge>
            </div>
            {terminal ? (
              <p className="rounded-[var(--radius)] bg-bg px-3 py-2 text-xs text-muted">
                Etapa terminal: este candidato ya está {STAGE_LABELS[application.stage].toLowerCase()}.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {APPLICATION_STAGES.filter((s) => s !== application.stage).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onMoveStage(application.id, s)}
                    className={[
                      "rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                      s === "rejected"
                        ? "border-border text-muted hover:border-danger hover:text-danger"
                        : "border-border text-muted hover:border-primary hover:text-primary",
                    ].join(" ")}
                  >
                    {STAGE_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
            {application.candidate.email && (
              <p className="text-xs text-muted">{application.candidate.email}</p>
            )}
          </section>

          {/* Notas internas */}
          <section className="flex flex-col gap-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Nota interna
            </h3>
            <NoteEditor
              applicationId={application.id}
              jobId={application.jobId}
              initialNotes={application.notes}
            />
          </section>

          {/* Entrevistas */}
          <section>
            <InterviewsSection
              applicationId={application.id}
              jobId={application.jobId}
              interviews={interviews}
            />
          </section>
        </div>
      )}
    </Dialog>
  );
}
