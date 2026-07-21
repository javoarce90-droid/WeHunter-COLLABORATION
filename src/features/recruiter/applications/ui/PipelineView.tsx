"use client";

import { useOptimistic, useState, useTransition, type ReactNode } from "react";
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
import { analizarPostulacionAction, moverEtapaAction } from "../actions";
import { STAGE_LABELS } from "../schema";
import type { ApplicationStage } from "../schema";
import type {
  ApplicationWithCandidate,
  StageHistoryEvent,
} from "../data/applications.queries";
import type { InterviewRow } from "@/features/recruiter/interviews/domain/agendar-entrevista";
import type { TeamMemberOption } from "@/features/recruiter/interviews/ui/InterviewForm";
import type { TimelineNote } from "@/features/recruiter/notes/data/notes.queries";
import type { PipelineStageConfig } from "@/features/recruiter/pipeline-stages/schema";
import type { ScreeningAnswerRow } from "@/features/recruiter/screening/data/screening.queries";
import { PipelineCard } from "./PipelineCard";
import { PipelineDetailSheet } from "./PipelineDetailSheet";
import { STAGE_DOT, isTerminal, getSlaStatus } from "./stage-visual";

type Props = {
  applications: ApplicationWithCandidate[];
  interviewsByApplication: Record<string, InterviewRow[]>;
  teamMembers: TeamMemberOption[];
  notesByApplication: Record<string, TimelineNote[]>;
  stageEventsByApplication: Record<string, StageHistoryEvent[]>;
  screeningAnswersByApplication: Record<string, ScreeningAnswerRow[]>;
  stageConfig: PipelineStageConfig[];
  stageEntryTimes: Record<string, Date>;
  actions?: ReactNode;
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
  onAnalizar: (applicationId: string) => void;
  analyzingIds: Set<string>;
};

function PipelineColumn({
  stageConf,
  cards,
  interviewsByApplication,
  notesByApplication,
  stageEntryTimes,
  onMoveStage,
  onOpen,
  onAnalizar,
  analyzingIds,
}: ColumnProps) {
  // Etapa desactivada + con candidatos igual se muestra (ver visibleStages más abajo), pero
  // no acepta drops: mismo criterio que ya respeta el selector manual "Cambiar etapa".
  const { setNodeRef, isOver } = useDroppable({
    id: stageConf.stageKey,
    disabled: !stageConf.isActive,
  });

  return (
    <section
      ref={setNodeRef}
      className={[
        "flex min-h-[60vh] w-[272px] shrink-0 flex-col gap-2.5 rounded-xl p-2.5 transition-colors",
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
              onAnalizar={onAnalizar}
              analyzing={analyzingIds.has(app.id)}
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
  teamMembers,
  notesByApplication,
  stageEventsByApplication,
  screeningAnswersByApplication,
  stageConfig,
  stageEntryTimes,
  actions,
}: Props) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [riskOnly, setRiskOnly] = useState(false);

  function onAnalizar(applicationId: string) {
    setAnalyzingIds((s) => new Set(s).add(applicationId));
    startTransition(async () => {
      const res = await analizarPostulacionAction(applicationId);
      setAnalyzingIds((s) => {
        const next = new Set(s);
        next.delete(applicationId);
        return next;
      });
      if (!res.ok)
        toast({
          message: res.error ?? "No se pudo analizar.",
          variant: "danger",
        });
      else toast({ message: "Candidato analizado con IA", variant: "success" });
    });
  }

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

  // Agrupar por etapa
  const grouped: Record<string, ApplicationWithCandidate[]> = {};
  for (const app of optimisticApps) {
    (grouped[app.stage] ??= []).push(app);
  }

  // "En riesgo" = SLA vencido o cerca de vencer en la etapa donde está hoy (ver getSlaStatus).
  const slaByStage = new Map(stageConfig.map((s) => [s.stageKey, s.slaDays]));
  const isAtRisk = (app: ApplicationWithCandidate) =>
    getSlaStatus(stageEntryTimes[app.id], slaByStage.get(app.stage)) !== null;
  const atRiskCount = optimisticApps.filter(isAtRisk).length;

  // Mostrar etapas activas + cualquier etapa con candidatos (aunque esté inactiva). Con el
  // filtro "en riesgo" activo, además se ocultan las columnas sin ningún candidato en riesgo.
  const visibleStages = stageConfig
    .filter((sc) => sc.isActive || (grouped[sc.stageKey]?.length ?? 0) > 0)
    .filter((sc) => !riskOnly || (grouped[sc.stageKey] ?? []).some(isAtRisk));

  const activeStageKeys = stageConfig
    .filter((s) => s.isActive)
    .map((s) => s.stageKey);
  const draggingApp = draggingId
    ? optimisticApps.find((a) => a.id === draggingId)
    : null;
  const selected = optimisticApps.find((a) => a.id === selectedId) ?? null;

  const isEmpty = applications.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm font-semibold text-text">
          {applications.length} candidato{applications.length !== 1 ? "s" : ""} en proceso
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {!isEmpty && (
            <button
              type="button"
              aria-pressed={riskOnly}
              onClick={() => setRiskOnly((v) => !v)}
              className={[
                "inline-flex items-center gap-1.5 rounded-[var(--radius)] border px-3 py-1.5 text-xs font-semibold outline-none transition-[transform,color,background-color,border-color] duration-150 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] active:scale-[0.98]",
                riskOnly
                  ? "border-transparent bg-[#FEF3C7] text-[#92400E]"
                  : "border-border bg-surface text-muted hover:text-text",
              ].join(" ")}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
                <path d="M6 0.5 11.5 11h-11L6 .5Zm-.6 4v3h1.2v-3H5.4Zm0 4v1.2h1.2V8.5H5.4Z" />
              </svg>
              Solo en riesgo
              <span className="tabular-nums">({atRiskCount})</span>
            </button>
          )}
          {actions}
        </div>
      </div>

      {isEmpty ? (
        <EmptyState
          title="No hay candidatos en el pipeline"
          description={
            <>
              Sumá candidatos del pool o creá uno nuevo con el botón{" "}
              <span className="font-semibold text-text">Agregar candidatos</span>.
            </>
          }
        />
      ) : riskOnly && atRiskCount === 0 ? (
        <EmptyState
          title="Ningún candidato en riesgo"
          description="Nadie está cerca de vencer su SLA en la etapa donde está hoy."
        />
      ) : (
        <DndContext
          id="pipeline-dnd"
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex gap-3 overflow-x-auto overflow-y-hidden pb-4">
            {visibleStages.map((stageConf) => (
              <PipelineColumn
                key={stageConf.stageKey}
                stageConf={stageConf}
                cards={
                  riskOnly
                    ? (grouped[stageConf.stageKey] ?? []).filter(isAtRisk)
                    : (grouped[stageConf.stageKey] ?? [])
                }
                interviewsByApplication={interviewsByApplication}
                notesByApplication={notesByApplication}
                stageEntryTimes={stageEntryTimes}
                onMoveStage={onMoveStage}
                onOpen={setSelectedId}
                onAnalizar={onAnalizar}
                analyzingIds={analyzingIds}
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
      )}

      <PipelineDetailSheet
        application={selected}
        interviews={
          selected ? (interviewsByApplication[selected.id] ?? []) : []
        }
        teamMembers={teamMembers}
        notes={selected ? (notesByApplication[selected.id] ?? []) : []}
        stageEvents={
          selected ? (stageEventsByApplication[selected.id] ?? []) : []
        }
        screeningAnswers={
          selected ? (screeningAnswersByApplication[selected.id] ?? []) : []
        }
        onMoveStage={onMoveStage}
        onClose={() => setSelectedId(null)}
        activeStageKeys={activeStageKeys}
      />
    </div>
  );
}
