"use client";

import { useOptimistic, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
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
import { SearchInput } from "@/components/ui/search-input";
import { FilterChip, FilterChipGroup } from "@/components/ui/filter-chip";
import { useToast } from "@/lib/toast";
import { analizarPostulacionAction, moverAEtapaAction } from "../actions";
import type {
  ApplicationWithCandidate,
  StageHistoryEvent,
} from "../data/applications.queries";
import type { InterviewRow } from "@/features/recruiter/interviews/domain/agendar-entrevista";
import type { TeamMemberOption } from "@/features/recruiter/interviews/ui/InterviewForm";
import type { TimelineNote } from "@/features/recruiter/notes/data/notes.queries";
import type { JobStage } from "@/features/recruiter/pipeline-stages/schema";
import { isClosingKind } from "@/features/recruiter/pipeline-stages/schema";
import type { ScreeningAnswerRow } from "@/features/recruiter/screening/data/screening.queries";
import { PipelineCard } from "./PipelineCard";
import { PipelineDetailSheet } from "./PipelineDetailSheet";
import { KIND_DOT, getSlaStatus } from "./stage-visual";

type Props = {
  jobId: string;
  applications: ApplicationWithCandidate[];
  /** Postulaciones que siguen en la bandeja: el tablero vacío ofrece ir a revisarlas. */
  pendientes: number;
  interviewsByApplication: Record<string, InterviewRow[]>;
  teamMembers: TeamMemberOption[];
  notesByApplication: Record<string, TimelineNote[]>;
  stageEventsByApplication: Record<string, StageHistoryEvent[]>;
  screeningAnswersByApplication: Record<string, ScreeningAnswerRow[]>;
  /** Etapas propias de esta búsqueda (job_stages), en orden. */
  stages: JobStage[];
  actions?: ReactNode;
};

type Move = { applicationId: string; toStage: JobStage };
type SortKey = "name" | "days" | "match";
type StatusFilter = "todos" | "riesgo" | "vencidos";

const noop = () => {};

// ── Column ──────────────────────────────────────────────────────────────────

type ColumnProps = {
  stage: JobStage;
  stages: JobStage[];
  cards: ApplicationWithCandidate[];
  interviewsByApplication: Record<string, InterviewRow[]>;
  notesByApplication: Record<string, TimelineNote[]>;
  onMoveStage: (applicationId: string, toStageId: string) => void;
  onOpen: (id: string) => void;
  onAnalizar: (applicationId: string) => void;
  analyzingIds: Set<string>;
};

function PipelineColumn({
  stage,
  stages,
  cards,
  interviewsByApplication,
  notesByApplication,
  onMoveStage,
  onOpen,
  onAnalizar,
  analyzingIds,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

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
          style={{ background: KIND_DOT[stage.kind] }}
          aria-hidden
        />
        <h3 className="text-sm font-semibold text-text">{stage.name}</h3>
        {stage.slaDays && (
          <span className="text-[10px] text-muted" title={`SLA: ${stage.slaDays} días`}>
            /{stage.slaDays}d
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
              stageName={stage.name}
              stages={stages}
              interviews={interviewsByApplication[app.id] ?? []}
              noteCount={notesByApplication[app.id]?.length ?? 0}
              onMoveStage={onMoveStage}
              onOpen={onOpen}
              onAnalizar={onAnalizar}
              analyzing={analyzingIds.has(app.id)}
              slaDays={stage.slaDays}
            />
          ))
        )}
      </div>
    </section>
  );
}

// ── Board ────────────────────────────────────────────────────────────────────

export function PipelineView({
  jobId,
  applications,
  pendientes,
  interviewsByApplication,
  teamMembers,
  notesByApplication,
  stageEventsByApplication,
  screeningAnswersByApplication,
  stages,
  actions,
}: Props) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");

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
        a.id === move.applicationId
          ? {
              ...a,
              stageId: move.toStage.id,
              stageKind: move.toStage.kind,
              stageEnteredAt: new Date(),
            }
          : a,
      ),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const stageById = new Map(stages.map((s) => [s.id, s]));

  function onMoveStage(applicationId: string, toStageId: string) {
    const app = optimisticApps.find((a) => a.id === applicationId);
    const toStage = stageById.get(toStageId);
    if (!app || !toStage || app.stageId === toStageId) return;
    if (app.stageKind && isClosingKind(app.stageKind)) return;
    const fromStageId = app.stageId;
    const name = app.candidate.fullName;

    startTransition(async () => {
      applyMove({ applicationId, toStage });
      const fd = new FormData();
      fd.set("applicationId", applicationId);
      fd.set("toStageId", toStageId);
      const res = await moverAEtapaAction({}, fd);
      if (res.error) {
        toast({ message: res.error, variant: "danger" });
        return;
      }
      toast({
        message: `${name} → ${toStage.name}`,
        variant: "success",
        action:
          isClosingKind(toStage.kind) || !fromStageId
            ? undefined
            : {
                label: "Deshacer",
                onClick: () => onMoveStage(applicationId, fromStageId),
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
    onMoveStage(active.id as string, over.id as string);
  }

  function handleDragCancel() {
    setDraggingId(null);
  }

  // Agrupar por etapa
  const grouped: Record<string, ApplicationWithCandidate[]> = {};
  for (const app of optimisticApps) {
    if (!app.stageId) continue;
    (grouped[app.stageId] ??= []).push(app);
  }

  // "En riesgo" = SLA vencido o cerca de vencer en la etapa donde está hoy (ver getSlaStatus).
  const isAtRisk = (app: ApplicationWithCandidate) =>
    getSlaStatus(app.stageEnteredAt, app.stageId ? stageById.get(app.stageId)?.slaDays : null) !== null;
  const atRiskCount = optimisticApps.filter(isAtRisk).length;

  // "Vencidos" = subconjunto de "en riesgo" con el SLA ya cumplido, no solo cerca.
  const isOverdue = (app: ApplicationWithCandidate) =>
    getSlaStatus(app.stageEnteredAt, app.stageId ? stageById.get(app.stageId)?.slaDays : null)?.status ===
    "over";
  const overdueCount = optimisticApps.filter(isOverdue).length;

  const q = query.trim().toLowerCase();
  const matchesQuery = (app: ApplicationWithCandidate) =>
    !q || app.candidate.fullName.toLowerCase().includes(q);

  function sortCards(cards: ApplicationWithCandidate[]): ApplicationWithCandidate[] {
    const sorted = [...cards];
    if (sortKey === "days") {
      // Más días en la etapa primero (entró antes = timestamp más chico).
      sorted.sort((a, b) => a.stageEnteredAt.getTime() - b.stageEnteredAt.getTime());
    } else if (sortKey === "match") {
      // Sin score va siempre al final, sin importar el resto del orden.
      sorted.sort((a, b) => {
        if (a.aiScore == null && b.aiScore == null) return 0;
        if (a.aiScore == null) return 1;
        if (b.aiScore == null) return -1;
        return b.aiScore - a.aiScore;
      });
    } else {
      sorted.sort((a, b) => a.candidate.fullName.localeCompare(b.candidate.fullName));
    }
    return sorted;
  }

  function cardsFor(stageId: string): ApplicationWithCandidate[] {
    let cards = grouped[stageId] ?? [];
    if (q) cards = cards.filter(matchesQuery);
    if (statusFilter === "riesgo") cards = cards.filter(isAtRisk);
    if (statusFilter === "vencidos") cards = cards.filter(isOverdue);
    return sortCards(cards);
  }

  const anyFilterActive = statusFilter !== "todos" || q.length > 0;

  // La bandeja ("Postulados") no es columna del tablero — eso es Postulados.
  const visibleStages = [...stages]
    .filter((s) => s.kind !== "inbox")
    .sort((a, b) => a.position - b.position)
    .filter((s) => !anyFilterActive || cardsFor(s.id).length > 0);

  const draggingApp = draggingId
    ? optimisticApps.find((a) => a.id === draggingId)
    : null;
  const draggingStage = draggingApp?.stageId ? stageById.get(draggingApp.stageId) : undefined;
  const selected = optimisticApps.find((a) => a.id === selectedId) ?? null;

  const isEmpty = applications.length === 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {!isEmpty && (
            <>
              <SearchInput
                value={query}
                onChange={setQuery}
                placeholder="Buscar candidato por nombre"
                aria-label="Buscar candidato en el pipeline"
                className="max-w-[200px]"
              />
              <FilterChipGroup label="Filtrar por estado del SLA">
                <FilterChip active={statusFilter === "todos"} onClick={() => setStatusFilter("todos")}>
                  Todos
                </FilterChip>
                <FilterChip
                  active={statusFilter === "riesgo"}
                  count={atRiskCount}
                  onClick={() => setStatusFilter("riesgo")}
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" aria-hidden>
                    <path d="M6 0.5 11.5 11h-11L6 .5Z" />
                    <path d="M6 4.5v3M6 9v.01" strokeLinecap="round" />
                  </svg>
                  En riesgo
                </FilterChip>
                <FilterChip
                  active={statusFilter === "vencidos"}
                  count={overdueCount}
                  onClick={() => setStatusFilter("vencidos")}
                >
                  <span className="h-2 w-2 rounded-full bg-danger" aria-hidden />
                  Vencidos
                </FilterChip>
              </FilterChipGroup>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isEmpty && (
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              aria-label="Ordenar candidatos"
              className="rounded-[var(--radius)] border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-text outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              <option value="name">Nombre</option>
              <option value="days">Más días en la etapa</option>
              <option value="match">Match</option>
            </select>
          )}
          {actions}
        </div>
      </div>

      <p className="text-sm font-semibold text-text">
        {applications.length} candidato{applications.length !== 1 ? "s" : ""} en proceso
      </p>

      {isEmpty ? (
        <EmptyState
          title="No hay candidatos en el pipeline"
          description={
            pendientes > 0 ? (
              <>
                Hay{" "}
                <Link
                  href={`/jobs/${jobId}/postulados`}
                  className="font-semibold text-primary hover:text-primary-hover"
                >
                  {pendientes} postulación{pendientes !== 1 ? "es" : ""} sin revisar
                </Link>
                . Avanzá desde ahí a quienes quieras trabajar, o sumá candidatos del pool con{" "}
                <span className="font-semibold text-text">Agregar candidatos</span>.
              </>
            ) : (
              <>
                Sumá candidatos del pool o creá uno nuevo con el botón{" "}
                <span className="font-semibold text-text">Agregar candidatos</span>.
              </>
            )
          }
        />
      ) : anyFilterActive && visibleStages.length === 0 ? (
        <EmptyState
          title="Sin resultados"
          description={
            q
              ? "Ningún candidato coincide con la búsqueda."
              : statusFilter === "vencidos"
                ? "Nadie tiene el SLA vencido en la etapa donde está hoy."
                : "Nadie está cerca de vencer su SLA en la etapa donde está hoy."
          }
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
            {visibleStages.map((stage) => (
              <PipelineColumn
                key={stage.id}
                stage={stage}
                stages={visibleStages}
                cards={cardsFor(stage.id)}
                interviewsByApplication={interviewsByApplication}
                notesByApplication={notesByApplication}
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
                stageName={draggingStage?.name ?? ""}
                stages={visibleStages}
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
        stages={visibleStages}
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
      />
    </div>
  );
}
