"use client";

import { useOptimistic, useState, useTransition } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/lib/toast";
import { moverEtapaAction } from "../actions";
import { APPLICATION_STAGES, STAGE_LABELS } from "../schema";
import type { ApplicationStage } from "../schema";
import type { ApplicationWithCandidate } from "../data/applications.queries";
import type { InterviewRow } from "@/features/recruiter/interviews/domain/agendar-entrevista";
import type { TimelineNote } from "@/features/recruiter/notes/data/notes.queries";
import { PipelineCard } from "./PipelineCard";
import { PipelineDetailSheet } from "./PipelineDetailSheet";
import { STAGE_DOT, isTerminal } from "./stage-visual";

type Props = {
  applications: ApplicationWithCandidate[];
  /** Entrevistas agrupadas por applicationId (una query arriba, sin N+1). */
  interviewsByApplication: Record<string, InterviewRow[]>;
  /** Notas del timeline agrupadas por applicationId. */
  notesByApplication: Record<string, TimelineNote[]>;
};

type Move = { applicationId: string; toStage: ApplicationStage };

/**
 * Orquestador del pipeline. Es el dueño del "motor de mover" abstraído: optimistic UI con
 * `useOptimistic` (PRODUCT.md #2 velocidad percibida) + toast con "Deshacer" (#4, sin modal).
 * La card y el sheet solo llaman `onMoveStage`; no saben si el disparador fue menú o teclado
 * (deja la puerta abierta a drag&drop sin tocar esta lógica — se decide en /impeccable live).
 */
export function PipelineView({
  applications,
  interviewsByApplication,
  notesByApplication,
}: Props) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [optimisticApps, applyMove] = useOptimistic(
    applications,
    (state, move: Move) =>
      state.map((a) =>
        a.id === move.applicationId ? { ...a, stage: move.toStage } : a,
      ),
  );

  function onMoveStage(applicationId: string, toStage: ApplicationStage) {
    const app = optimisticApps.find((a) => a.id === applicationId);
    if (!app || app.stage === toStage || isTerminal(app.stage)) return;
    const fromStage = app.stage;
    const name = app.candidate.fullName;

    startTransition(async () => {
      applyMove({ applicationId, toStage });
      const fd = new FormData();
      fd.set("applicationId", applicationId);
      fd.set("newStage", toStage);
      const res = await moverEtapaAction({}, fd);
      if (res.error) {
        toast({ message: res.error, variant: "danger" });
        return;
      }
      toast({
        message: `${name} → ${STAGE_LABELS[toStage]}`,
        variant: "success",
        // Solo ofrecemos deshacer cuando el destino no es terminal (el dominio bloquea
        // salir de hired/rejected, así que sería una promesa falsa).
        action: isTerminal(toStage)
          ? undefined
          : {
              label: "Deshacer",
              onClick: () => onMoveStage(applicationId, fromStage),
            },
      });
    });
  }

  if (applications.length === 0) {
    return (
      <EmptyState
        title="No hay candidatos en el pipeline"
        description={
          <>
            Postulá candidatos desde el pool con el botón{" "}
            <span className="font-semibold text-text">Postular candidato</span>.
          </>
        }
      />
    );
  }

  const selected = optimisticApps.find((a) => a.id === selectedId) ?? null;

  const grouped = Object.fromEntries(
    APPLICATION_STAGES.map((s) => [s, [] as ApplicationWithCandidate[]]),
  ) as Record<ApplicationStage, ApplicationWithCandidate[]>;
  for (const app of optimisticApps) grouped[app.stage].push(app);

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {APPLICATION_STAGES.map((stage) => {
          const cards = grouped[stage];
          return (
            <section
              key={stage}
              className="flex w-[272px] shrink-0 flex-col gap-2.5 rounded-xl bg-text/[0.035] p-2.5"
            >
              <header className="flex items-center gap-2 px-1">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: STAGE_DOT[stage] }}
                  aria-hidden
                />
                <h3 className="text-sm font-semibold text-text">{STAGE_LABELS[stage]}</h3>
                <span className="ml-auto text-xs font-semibold text-muted tabular-nums">
                  {cards.length}
                </span>
              </header>

              <div className="flex flex-col gap-2">
                {cards.length === 0 ? (
                  <div className="rounded-[var(--radius)] border border-dashed border-border px-3 py-6 text-center text-xs text-muted">
                    Sin candidatos
                  </div>
                ) : (
                  cards.map((app) => (
                    <PipelineCard
                      key={app.id}
                      application={app}
                      interviews={interviewsByApplication[app.id] ?? []}
                      noteCount={notesByApplication[app.id]?.length ?? 0}
                      onMoveStage={onMoveStage}
                      onOpen={setSelectedId}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      <PipelineDetailSheet
        application={selected}
        interviews={selected ? interviewsByApplication[selected.id] ?? [] : []}
        notes={selected ? notesByApplication[selected.id] ?? [] : []}
        onMoveStage={onMoveStage}
        onClose={() => setSelectedId(null)}
      />
    </>
  );
}
