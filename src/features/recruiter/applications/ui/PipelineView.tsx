"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/lib/toast";
import { moverEtapaAction } from "../actions";
import { STAGE_LABELS } from "../schema";
import type { ApplicationStage } from "../schema";
import type { ApplicationWithCandidate } from "../data/applications.queries";
import type { InterviewRow } from "@/features/recruiter/interviews/domain/agendar-entrevista";
import type { TimelineNote } from "@/features/recruiter/notes/data/notes.queries";
import type { PipelineStageConfig } from "@/features/recruiter/pipeline-stages/schema";
import { PipelineCard } from "./PipelineCard";
import { PipelineDetailSheet } from "./PipelineDetailSheet";
import { STAGE_DOT, isTerminal } from "./stage-visual";

type Props = {
  applications: ApplicationWithCandidate[];
  interviewsByApplication: Record<string, InterviewRow[]>;
  notesByApplication: Record<string, TimelineNote[]>;
  stageConfig: PipelineStageConfig[];
  stageEntryTimes: Record<string, Date>;
};

type Move = { applicationId: string; toStage: ApplicationStage };

const noop = () => {};

// ── Column ──────────────────────────────────────────────────────────────────

type ColumnProps = {
  stageConf: PipelineStageConfig;
  cards: ApplicationWithCandidate[];
  interviewsByApplication: Record<string, InterviewRow[]>;
  notesByApplication: Record<string, TimelineNote[]>;
  stageEntryTimes: Record<string, Date>;
  onMoveStage: (applicationId: string, toStage: ApplicationStage) => void;
  onOpen: (id: string) => void;
};

function PipelineColumn({
  stageConf,
  cards,
  interviewsByApplication,
  notesByApplication,
  stageEntryTimes,
  onMoveStage,
  onOpen,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stageConf.stageKey });

  return (
    <section
      ref={setNodeRef}
      className={[
        "flex w-[272px] shrink-0 flex-col gap-2.5 rounded-xl p-2.5 transition-colors",
        isOver ? "bg-primary/[0.06] ring-1 ring-primary/20" : "bg-text/[0.035]",
      ].join(" ")}
    >
      <header className="flex items-center gap-2 px-1">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: STAGE_DOT[stageConf.stageKey] }}
          aria-hidden
        />
        <h3 className="text-sm font-semibold text-text">{stageConf.label}</h3>
        {stageConf.slaDays && (
          <span
            className="text-[10px] text-muted"
            title={`SLA: ${stageConf.slaDays} días`}
          >
            /{stageConf.slaDays}d
          </span>
        )}
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
              onOpen={onOpen}
              enteredStageAt={stageEntryTimes[app.id]}
              slaDays={stageConf.slaDays}
            />
          ))
        )}
      </div>
    </section>
  );
}

// ── Board ────────────────────────────────────────────────────────────────────

export function PipelineView({
  applications,
  interviewsByApplication,
  notesByApplication,
  stageConfig,
  stageEntryTimes,
}: Props) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const [optimisticApps, applyMove] = useOptimistic(
    applications,
    (state, move: Move) =>
      state.map((a) =>
        a.id === move.applicationId ? { ...a, stage: move.toStage } : a,
      ),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
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
        action: isTerminal(toStage)
          ? undefined
          : {
              label: "Deshacer",
              onClick: () => onMoveStage(applicationId, fromStage),
            },
      });
    });
  }

  function handleDragStart({ active }: DragStartEvent) {
    setDraggingId(active.id as string);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDraggingId(null);
    if (!over || active.id === over.id) return;
    onMoveStage(active.id as string, over.id as ApplicationStage);
  }

  function handleDragCancel() {
    setDraggingId(null);
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

  // Agrupar por etapa
  const grouped: Record<string, ApplicationWithCandidate[]> = {};
  for (const app of optimisticApps) {
    (grouped[app.stage] ??= []).push(app);
  }

  // Mostrar etapas activas + cualquier etapa con candidatos (aunque esté inactiva)
  const visibleStages = stageConfig.filter(
    (sc) => sc.isActive || (grouped[sc.stageKey]?.length ?? 0) > 0,
  );

  const activeStageKeys = stageConfig.filter((s) => s.isActive).map((s) => s.stageKey);
  const draggingApp = draggingId ? optimisticApps.find((a) => a.id === draggingId) : null;
  const selected = optimisticApps.find((a) => a.id === selectedId) ?? null;

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {visibleStages.map((stageConf) => (
            <PipelineColumn
              key={stageConf.stageKey}
              stageConf={stageConf}
              cards={grouped[stageConf.stageKey] ?? []}
              interviewsByApplication={interviewsByApplication}
              notesByApplication={notesByApplication}
              stageEntryTimes={stageEntryTimes}
              onMoveStage={onMoveStage}
              onOpen={setSelectedId}
            />
          ))}
        </div>

        <DragOverlay>
          {draggingApp ? (
            <PipelineCard
              application={draggingApp}
              interviews={interviewsByApplication[draggingApp.id] ?? []}
              noteCount={notesByApplication[draggingApp.id]?.length ?? 0}
              onMoveStage={noop}
              onOpen={noop}
              isDragOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      <PipelineDetailSheet
        application={selected}
        interviews={selected ? interviewsByApplication[selected.id] ?? [] : []}
        notes={selected ? notesByApplication[selected.id] ?? [] : []}
        onMoveStage={onMoveStage}
        onClose={() => setSelectedId(null)}
        activeStageKeys={activeStageKeys}
      />
    </>
  );
}
