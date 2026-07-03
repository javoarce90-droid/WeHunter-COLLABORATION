"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Menu, MenuItem, MenuLabel } from "@/components/ui/menu";
import { AiButton, AiScore } from "@/components/ui/ai";
import { useToast } from "@/lib/toast";
import { NoteTimeline } from "@/features/recruiter/notes/ui/NoteTimeline";
import { InterviewsSection } from "@/features/recruiter/interviews/ui/InterviewsSection";
import { generarGuiaEntrevistaAction } from "../actions";
import { APPLICATION_STAGES, STAGE_LABELS } from "../schema";
import type { ApplicationStage } from "../schema";
import type { ApplicationWithCandidate, StageHistoryEvent } from "../data/applications.queries";
import type { InterviewRow } from "@/features/recruiter/interviews/domain/agendar-entrevista";
import type { TimelineNote } from "@/features/recruiter/notes/data/notes.queries";
import { isTerminal } from "./stage-visual";
import { StageHistoryTimeline } from "./StageHistoryTimeline";

type Props = {
  application: ApplicationWithCandidate | null;
  interviews: InterviewRow[];
  notes: TimelineNote[];
  stageEvents: StageHistoryEvent[];
  onMoveStage: (applicationId: string, toStage: ApplicationStage) => void;
  onClose: () => void;
  /** Si se pasa, solo muestra botones para estas etapas (activas). */
  activeStageKeys?: ApplicationStage[];
};

/**
 * Panel lateral de detalle de una postulación. Co-localiza todo lo profundo que antes
 * inflaba la card: mover de etapa, notas y entrevistas. Sheet (no modal): conserva el
 * contexto del tablero detrás (PRODUCT.md: el modal es último recurso).
 */
export function PipelineDetailSheet({
  application,
  interviews,
  notes,
  stageEvents,
  onMoveStage,
  onClose,
  activeStageKeys,
}: Props) {
  const toast = useToast();
  const [, startGuide] = useTransition();
  // Guía cacheada por postulación: solo se muestra si matchea la abierta (sin efectos).
  const [guide, setGuide] = useState<{ appId: string; questions: string[] } | null>(null);

  const open = application !== null;
  const terminal = application ? isTerminal(application.stage) : false;
  const guideQuestions =
    application && guide?.appId === application.id ? guide.questions : null;

  function generarGuia() {
    if (!application) return;
    const app = application;
    startGuide(async () => {
      const res = await generarGuiaEntrevistaAction(app.jobId, app.candidate.fullName);
      if (!res.ok || !res.questions) {
        toast({ message: res.error ?? "No se pudo generar la guía.", variant: "danger" });
        return;
      }
      setGuide({ appId: app.id, questions: res.questions });
    });
  }

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
              <span className="text-xs font-semibold uppercase tracking-wide text-label">
                Etapa
              </span>
              <div className="flex items-center gap-2">
                {application.aiScore != null && <AiScore score={application.aiScore} size={26} />}
                <Badge variant={application.stage}>{STAGE_LABELS[application.stage]}</Badge>
              </div>
            </div>
            {application.aiScore != null && application.aiSummary && (
              <p className="text-xs text-muted">{application.aiSummary}</p>
            )}
            {terminal ? (
              <p className="rounded-[var(--radius)] bg-bg px-3 py-2 text-xs text-muted">
                Etapa terminal: este candidato ya está {STAGE_LABELS[application.stage].toLowerCase()}.
              </p>
            ) : (
              <Menu
                align="start"
                trigger={
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-border px-2.5 py-1.5 text-xs font-semibold text-text transition-colors hover:border-primary hover:text-primary"
                  >
                    Cambiar etapa
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="m2.5 4.5 3.5 3 3.5-3" />
                    </svg>
                  </button>
                }
              >
                <MenuLabel>Mover a</MenuLabel>
                {(activeStageKeys ?? APPLICATION_STAGES)
                  .filter((s) => s !== application.stage)
                  .map((s) => (
                    <MenuItem
                      key={s}
                      destructive={s === "rejected"}
                      onClick={() => onMoveStage(application.id, s)}
                    >
                      {STAGE_LABELS[s]}
                    </MenuItem>
                  ))}
              </Menu>
            )}
            {application.candidate.email && (
              <p className="text-xs text-muted">{application.candidate.email}</p>
            )}
          </section>

          {/* Historial de etapa (timeline de application_events) */}
          <section className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-label">
                Historial de etapa
              </h3>
              <Link
                href={`/candidates/${application.candidate.id}/historial`}
                className="text-xs font-medium text-primary hover:text-primary-hover"
              >
                Ver historial completo →
              </Link>
            </div>
            <StageHistoryTimeline events={stageEvents} />
          </section>

          {/* Notas internas (timeline) */}
          <section className="flex flex-col gap-1.5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-label">
              Notas internas
            </h3>
            <NoteTimeline
              applicationId={application.id}
              jobId={application.jobId}
              notes={notes}
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

          {/* Guía de entrevista (IA mock) */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-label">
                Guía de entrevista
              </h3>
              <AiButton type="button" onClick={generarGuia}>
                {guideQuestions ? "Regenerar" : "Generar"}
              </AiButton>
            </div>
            {guideQuestions ? (
              <ol className="flex flex-col gap-1.5">
                {guideQuestions.map((q, i) => (
                  <li key={i} className="flex gap-2 text-sm text-text">
                    <span className="shrink-0 font-semibold text-primary tabular-nums">{i + 1}.</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-muted">
                Generá preguntas sugeridas según el perfil y la búsqueda.
              </p>
            )}
          </section>
        </div>
      )}
    </Dialog>
  );
}
