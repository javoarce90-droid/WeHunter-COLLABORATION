"use client";

import {
  useEffect,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
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
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { FilterChip, FilterChipGroup } from "@/components/ui/filter-chip";
import { IconButton } from "@/components/ui/icon-button";
import { useToast } from "@/lib/toast";
import {
  analizarPostulacionAction,
  moverAEtapaAction,
  guardarEnTalentPoolAction,
} from "../actions";
import { legacyStageFor } from "../domain/mover-a-etapa";
import type {
  ApplicationWithCandidate,
  PostuladoRow,
  StageHistoryEvent,
} from "../data/applications.queries";
import type { InterviewRow } from "@/features/recruiter/interviews/domain/agendar-entrevista";
import type { TeamMemberOption } from "@/features/recruiter/interviews/ui/InterviewForm";
import type { TimelineNote } from "@/features/recruiter/notes/data/notes.queries";
import type { JobStage } from "@/features/recruiter/pipeline-stages/schema";
import { isClosingKind } from "@/features/recruiter/pipeline-stages/schema";
import {
  agregarEtapaAction,
  renombrarEtapaAction,
  eliminarEtapaAction,
  reordenarEtapasAction,
  configurarSlaEtapaBusquedaAction,
} from "@/features/recruiter/pipeline-stages/actions";
import type { CriteriosEvaluados } from "@/features/recruiter/screening/domain/evaluar-criterios";
import { PipelineCard } from "./PipelineCard";
import { PostuladoDetailSheet, type ScreeningAnswerLine } from "./PostuladoDetailSheet";
import { AiAnalysisDialog, type AiAnalysisSubject } from "./AiAnalysisDialog";
import { ScheduleInterviewDialog } from "./ScheduleInterviewDialog";
import { AddNoteDialog } from "./AddNoteDialog";
import { SendWhatsappDialog } from "./SendWhatsappDialog";
import { ContactarDialog } from "./ContactarDialog";
import { TagsDialog } from "@/features/recruiter/candidates/ui/TagsDialog";
import type { CandidateTagRow } from "@/features/recruiter/candidates/data/tags.queries";
import { KIND_DOT, getSlaStatus } from "./stage-visual";

type Props = {
  jobId: string;
  jobTitle: string;
  applications: ApplicationWithCandidate[];
  /** Postulaciones que siguen en la bandeja: el tablero vacío ofrece ir a revisarlas. */
  pendientes: number;
  interviewsByApplication: Record<string, InterviewRow[]>;
  teamMembers: TeamMemberOption[];
  notesByApplication: Record<string, TimelineNote[]>;
  stageEventsByApplication: Record<string, StageHistoryEvent[]>;
  criteriosByApplication: Record<string, CriteriosEvaluados>;
  screeningByApplication: Record<string, ScreeningAnswerLine[]>;
  tagsByCandidate: Record<string, CandidateTagRow[]>;
  /** Etapas propias de esta búsqueda (job_stages), en orden. */
  stages: JobStage[];
  /** Puede agregar/renombrar/eliminar/reordenar etapas (capability `stages.configure`). */
  canConfigureStages: boolean;
};

/** Adapta una card del tablero al shape que espera el sheet de detalle compartido con
 *  Postulados (mismo componente, ver `.claude`/pedido del usuario: unificar la ficha). */
function toPostuladoRow(app: ApplicationWithCandidate): PostuladoRow {
  return {
    id: app.id,
    stage: app.stage,
    pipelineEnteredAt: app.pipelineEnteredAt,
    selfApplied: app.selfApplied,
    aiScore: app.aiScore,
    aiSummary: app.aiSummary,
    aiRedFlags: app.aiRedFlags,
    aiBreakdown: app.aiBreakdown,
    aiStrengths: app.aiStrengths,
    coverNote: app.coverNote,
    expectedSalary: app.expectedSalary,
    expectedSalaryCurrency: app.expectedSalaryCurrency,
    createdAt: app.createdAt,
    // No se usa en el sheet de detalle (solo en la fila de la tabla de Postulados) — evita
    // traer la subquery correlacionada de listApplicationsByJob solo para este dato muerto.
    applicationCount: 0,
    candidate: app.candidate,
  };
}

/** Qué diálogo de acción rápida está abierto (menú de 3 puntos de una card), si alguno. */
type QuickDialog =
  | { kind: "interview" | "email" | "whatsapp" | "tags" | "note"; applicationId: string }
  | null;

type Move = { applicationId: string; toStage: JobStage };
type StageUpdate =
  | { type: "patch"; stageId: string; patch: Partial<JobStage> }
  | { type: "remove"; stageId: string }
  | { type: "reorder"; stages: JobStage[] };
type SortKey = "name" | "days" | "match";
type StatusFilter = "todos" | "riesgo" | "vencidos";

const noop = () => {};

/** Mismo criterio que ya aplica el dominio (KINDS_IRREMPLAZABLES en gestionar-etapas-busqueda.ts). */
const SIN_SLA_KINDS = new Set(["hired", "rejected"]);
const SIN_BORRADO_KINDS = new Set(["inbox", "hired", "rejected"]);

// ── Controles inline del header de columna ──────────────────────────────────

function StageNameInput({
  value,
  onCommit,
  autoFocus,
  onConsumedAutoFocus,
}: {
  value: string;
  onCommit: (name: string) => void;
  autoFocus?: boolean;
  onConsumedAutoFocus?: () => void;
}) {
  const [local, setLocal] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      ref.current.select();
      onConsumedAutoFocus?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus]);

  function commit() {
    const name = local.trim();
    if (name.length < 2 || name === value) {
      setLocal(value);
      return;
    }
    onCommit(name);
  }

  return (
    <input
      ref={ref}
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      aria-label={`Nombre de la etapa ${value}`}
      className="min-w-0 flex-1 truncate rounded border border-transparent bg-transparent px-1 py-1 text-sm font-semibold text-text outline-none transition-colors hover:border-border focus:border-primary focus:bg-surface"
    />
  );
}

function SlaInputInline({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const [local, setLocal] = useState(value !== null ? String(value) : "");

  function commit() {
    const n = local.trim() === "" ? null : parseInt(local, 10);
    if (n !== null && (isNaN(n) || n < 1)) {
      setLocal(value !== null ? String(value) : "");
      return;
    }
    onChange(n);
  }

  return (
    <div className="flex shrink-0 items-center gap-1" title="SLA en días">
      <input
        type="number"
        min={1}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        placeholder="—"
        aria-label="SLA en días"
        className="w-8 rounded border border-transparent bg-transparent px-1 py-1 text-center text-xs font-medium text-muted outline-none transition-colors hover:border-border focus:border-primary focus:bg-surface focus:text-text"
      />
      <span className="text-[11px] text-muted">d</span>
    </div>
  );
}

function AddStageTile({ onAdd, disabled }: { onAdd: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={disabled}
      aria-label="Agregar etapa"
      title="Agregar etapa"
      className="flex min-h-[60vh] w-12 shrink-0 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-transparent text-muted transition-colors hover:border-primary/40 hover:bg-primary/[0.04] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  );
}

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
  onScheduleInterview: (applicationId: string) => void;
  onSendEmail: (applicationId: string) => void;
  onSendWhatsapp: (applicationId: string) => void;
  onAddTag: (applicationId: string) => void;
  onAddNote: (applicationId: string) => void;
  analyzingIds: Set<string>;
  canConfigureStages: boolean;
  onRenameStage: (stageId: string, name: string) => void;
  onSlaChange: (stageId: string, slaDays: number | null) => void;
  onDeleteStage: (stage: JobStage) => void;
  autoFocusName: boolean;
  onConsumedAutoFocus: () => void;
};

type ColumnBodyProps = ColumnProps & {
  setNodeRef: (node: HTMLElement | null) => void;
  style?: CSSProperties;
  isOver: boolean;
  isDragging?: boolean;
  dragHandle?: {
    attributes: DraggableAttributes;
    listeners: DraggableSyntheticListeners;
  };
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
  onScheduleInterview,
  onSendEmail,
  onSendWhatsapp,
  onAddTag,
  onAddNote,
  analyzingIds,
  canConfigureStages,
  onRenameStage,
  onSlaChange,
  onDeleteStage,
  autoFocusName,
  onConsumedAutoFocus,
  setNodeRef,
  style,
  isOver,
  isDragging,
  dragHandle,
}: ColumnBodyProps) {
  const sinSla = SIN_SLA_KINDS.has(stage.kind);
  const sinBorrado = SIN_BORRADO_KINDS.has(stage.kind);

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={[
        "flex min-h-[60vh] w-[272px] shrink-0 flex-col gap-3 rounded-xl p-3 transition-colors",
        isOver ? "bg-primary/[0.06] ring-1 ring-primary/20" : "bg-text/[0.035]",
        isDragging && "opacity-40",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="group/col flex items-center gap-2 px-1">
        {dragHandle && (
          <button
            type="button"
            aria-label={`Reordenar ${stage.name}`}
            {...dragHandle.attributes}
            {...dragHandle.listeners}
            className="flex h-4 w-4 shrink-0 cursor-grab touch-none items-center justify-center text-muted/40 opacity-0 outline-none transition-opacity hover:text-muted focus-visible:opacity-100 group-hover/col:opacity-100 active:cursor-grabbing"
          >
            <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden>
              <circle cx="2.5" cy="2.5" r="1.4" />
              <circle cx="7.5" cy="2.5" r="1.4" />
              <circle cx="2.5" cy="8" r="1.4" />
              <circle cx="7.5" cy="8" r="1.4" />
              <circle cx="2.5" cy="13.5" r="1.4" />
              <circle cx="7.5" cy="13.5" r="1.4" />
            </svg>
          </button>
        )}
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: KIND_DOT[stage.kind] }}
          aria-hidden
        />
        {canConfigureStages ? (
          <StageNameInput
            value={stage.name}
            onCommit={(name) => onRenameStage(stage.id, name)}
            autoFocus={autoFocusName}
            onConsumedAutoFocus={onConsumedAutoFocus}
          />
        ) : (
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{stage.name}</h3>
        )}
        {!sinSla &&
          (canConfigureStages ? (
            <SlaInputInline
              value={stage.slaDays}
              onChange={(v) => onSlaChange(stage.id, v)}
            />
          ) : (
            stage.slaDays && (
              <span className="shrink-0 text-[11px] font-medium text-muted" title={`SLA: ${stage.slaDays} días`}>
                /{stage.slaDays}d
              </span>
            )
          ))}
        <span className="shrink-0 text-xs font-semibold text-muted tabular-nums">{cards.length}</span>
        {canConfigureStages && !sinBorrado && (
          <IconButton
            aria-label={`Eliminar ${stage.name}`}
            size="sm"
            disabled={cards.length > 0}
            title={
              cards.length > 0
                ? `Mové a los ${cards.length} candidato${cards.length !== 1 ? "s" : ""} antes de eliminar "${stage.name}"`
                : `Eliminar ${stage.name}`
            }
            onClick={() => onDeleteStage(stage)}
            className="shrink-0 opacity-0 transition-opacity hover:text-danger focus-visible:opacity-100 disabled:opacity-0 group-hover/col:opacity-100 group-hover/col:disabled:opacity-40"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" />
            </svg>
          </IconButton>
        )}
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
              onScheduleInterview={onScheduleInterview}
              onSendEmail={onSendEmail}
              onSendWhatsapp={onSendWhatsapp}
              onAddTag={onAddTag}
              onAddNote={onAddNote}
              analyzing={analyzingIds.has(app.id)}
              slaDays={stage.slaDays}
            />
          ))
        )}
      </div>
    </section>
  );
}

/** Columna `in_process`: además de recibir drops de cards, se puede arrastrar entre sí para
 *  reordenar el proceso. Deshabilitada (sin agarradera efectiva) sin permiso o con filtros
 *  activos, porque el reordenamiento necesita el set completo de columnas visibles. */
function SortableStageColumn(props: ColumnProps & { canDrag: boolean }) {
  const { canDrag, ...rest } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: props.stage.id,
    data: { type: "column" },
    disabled: !canDrag,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, transition }
    : undefined;

  return (
    <PipelineColumn
      {...rest}
      setNodeRef={setNodeRef}
      style={style}
      isOver={isOver}
      isDragging={isDragging}
      dragHandle={canDrag ? { attributes, listeners } : undefined}
    />
  );
}

/** Columnas de cierre (oferta/contratado/descartado): reciben drops de cards, pero no se
 *  arrastran entre sí — son el ancla fija al final del proceso. */
function StaticStageColumn(props: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: props.stage.id });
  return <PipelineColumn {...props} setNodeRef={setNodeRef} isOver={isOver} />;
}

// ── Board ────────────────────────────────────────────────────────────────────

export function PipelineView({
  jobId,
  jobTitle,
  applications,
  pendientes,
  interviewsByApplication,
  teamMembers,
  notesByApplication,
  stageEventsByApplication,
  criteriosByApplication,
  screeningByApplication,
  tagsByCandidate,
  stages,
  canConfigureStages,
}: Props) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aiDetailId, setAiDetailId] = useState<string | null>(null);
  const [quickDialog, setQuickDialog] = useState<QuickDialog>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [draggingIsColumn, setDraggingIsColumn] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [addingStage, setAddingStage] = useState(false);
  const [focusStageId, setFocusStageId] = useState<string | null>(null);

  const onScheduleInterview = (applicationId: string) =>
    setQuickDialog({ kind: "interview", applicationId });
  const onSendEmail = (applicationId: string) => setQuickDialog({ kind: "email", applicationId });
  const onSendWhatsapp = (applicationId: string) =>
    setQuickDialog({ kind: "whatsapp", applicationId });
  const onAddTag = (applicationId: string) => setQuickDialog({ kind: "tags", applicationId });
  const onAddNote = (applicationId: string) => setQuickDialog({ kind: "note", applicationId });
  const closeQuickDialog = () => setQuickDialog(null);

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
              // El sheet unificado con Postulados muestra el badge de estado a partir de
              // `stage` (el enum legacy), no de `stageId` — sin este espejo optimista queda
              // desactualizado hasta el revalidate del server (mismo mirror que hace
              // `moveToStage` server-side vía `legacyStageFor`).
              stage: legacyStageFor(move.toStage),
            }
          : a,
      ),
  );

  const [optimisticStages, applyStageUpdate] = useOptimistic(
    stages,
    (state, update: StageUpdate) => {
      if (update.type === "reorder") return update.stages;
      if (update.type === "remove") return state.filter((s) => s.id !== update.stageId);
      return state.map((s) => (s.id === update.stageId ? { ...s, ...update.patch } : s));
    },
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const stageById = new Map(optimisticStages.map((s) => [s.id, s]));

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

  function withErrorToast(res: { ok: boolean; error?: string }, fallback: string) {
    if (!res.ok) toast({ message: res.error ?? fallback, variant: "danger" });
  }

  function onRenameStage(stageId: string, name: string) {
    startTransition(async () => {
      applyStageUpdate({ type: "patch", stageId, patch: { name } });
      withErrorToast(await renombrarEtapaAction(jobId, stageId, name), "No se pudo renombrar la etapa.");
    });
  }

  function onSlaChange(stageId: string, slaDays: number | null) {
    startTransition(async () => {
      applyStageUpdate({ type: "patch", stageId, patch: { slaDays } });
      withErrorToast(
        await configurarSlaEtapaBusquedaAction(jobId, stageId, slaDays),
        "No se pudo actualizar el SLA.",
      );
    });
  }

  function onDeleteStage(stage: JobStage) {
    startTransition(async () => {
      applyStageUpdate({ type: "remove", stageId: stage.id });
      withErrorToast(await eliminarEtapaAction(jobId, stage.id), "No se pudo eliminar la etapa.");
    });
  }

  /** "Nueva etapa", "Nueva etapa 2"... evita el choque de nombre duplicado si se crean
   *  varias seguidas sin renombrar la anterior. */
  function nombreEtapaDisponible(): string {
    const base = "Nueva etapa";
    const enUso = new Set(optimisticStages.map((s) => s.name.trim().toLowerCase()));
    if (!enUso.has(base.toLowerCase())) return base;
    let i = 2;
    while (enUso.has(`${base} ${i}`.toLowerCase())) i++;
    return `${base} ${i}`;
  }

  function onAddStage() {
    setAddingStage(true);
    startTransition(async () => {
      const res = await agregarEtapaAction(jobId, nombreEtapaDisponible());
      setAddingStage(false);
      if (!res.ok) {
        toast({ message: res.error ?? "No se pudo agregar la etapa.", variant: "danger" });
        return;
      }
      if (res.stageId) setFocusStageId(res.stageId);
    });
  }

  function onReorderColumns(activeId: string, overId: string) {
    if (activeId === overId) return;
    const ids = inProcessStages.map((s) => s.id);
    const oldIndex = ids.indexOf(activeId);
    const newIndex = ids.indexOf(overId);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(inProcessStages, oldIndex, newIndex);
    const inbox = optimisticStages.find((s) => s.kind === "inbox");
    const fullOrder = [...(inbox ? [inbox] : []), ...reordered, ...closingStages];

    startTransition(async () => {
      applyStageUpdate({
        type: "reorder",
        stages: fullOrder.map((s, i) => ({ ...s, position: i })),
      });
      withErrorToast(
        await reordenarEtapasAction(jobId, fullOrder.map((s) => s.id)),
        "No se pudo reordenar el pipeline.",
      );
    });
  }

  function onGuardarEnPool(row: PostuladoRow) {
    startTransition(async () => {
      const res = await guardarEnTalentPoolAction({ jobId, applicationIds: [row.id] });
      if (!res.ok) {
        toast({
          message: res.error ?? "No se pudo guardar en el Talent Pool.",
          variant: "danger",
        });
        return;
      }
      toast({
        message: `${row.candidate.fullName} guardado en el Talent Pool`,
        variant: "success",
      });
    });
  }

  // "Descartar" desde el sheet unificado hace lo mismo que elegir la etapa Descartado en
  // "Cambiar etapa" — no duplicamos el flujo de motivo/notificación de Postulados acá, ya
  // que en Pipeline mover a esa etapa YA es la forma establecida de rechazar.
  function onDescartarDesdeSheet(row: PostuladoRow) {
    const rejectedStage = optimisticStages.find((s) => s.kind === "rejected");
    if (!rejectedStage) {
      toast({
        message: "Esta búsqueda no tiene una etapa de descarte configurada.",
        variant: "danger",
      });
      return;
    }
    onMoveStage(row.id, rejectedStage.id);
  }

  function handleDragStart({ active }: DragStartEvent) {
    setDraggingId(active.id as string);
    setDraggingIsColumn(active.data.current?.type === "column");
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDraggingId(null);
    if (!over || active.id === over.id) return;
    if (active.data.current?.type === "column") {
      onReorderColumns(active.id as string, over.id as string);
      return;
    }
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
  const visibleStages = [...optimisticStages]
    .filter((s) => s.kind !== "inbox")
    .sort((a, b) => a.position - b.position)
    .filter((s) => !anyFilterActive || cardsFor(s.id).length > 0);

  // Las etapas de cierre (oferta/contratado/descartado) quedan siempre al final y fijas —
  // solo las `in_process` que agrega el recruiter se reordenan por drag.
  const inProcessStages = visibleStages.filter((s) => s.kind === "in_process");
  const closingStages = visibleStages.filter((s) => s.kind !== "in_process");
  // Reordenar (y agregar) necesita el set COMPLETO de columnas: con un filtro/búsqueda activo
  // el tablero solo muestra un subconjunto, y enviar ese subconjunto al server dejaría
  // huérfanas las etapas ocultas por el filtro.
  const canEditPipelineShape = canConfigureStages && !anyFilterActive;

  const draggingApp = !draggingIsColumn && draggingId
    ? optimisticApps.find((a) => a.id === draggingId)
    : null;
  const draggingStage = draggingIsColumn && draggingId ? stageById.get(draggingId) : null;
  const draggingStageForOverlay = draggingApp?.stageId ? stageById.get(draggingApp.stageId) : undefined;
  const selected = optimisticApps.find((a) => a.id === selectedId) ?? null;
  const selectedPostulado = selected ? toPostuladoRow(selected) : null;
  const quickApp = quickDialog
    ? (optimisticApps.find((a) => a.id === quickDialog.applicationId) ?? null)
    : null;

  const aiDetailApp = aiDetailId ? optimisticApps.find((a) => a.id === aiDetailId) : undefined;
  const aiDetailSubject: AiAnalysisSubject | null =
    aiDetailApp && aiDetailApp.aiScore != null
      ? {
          name: aiDetailApp.candidate.fullName,
          headline: aiDetailApp.candidate.headline,
          score: aiDetailApp.aiScore,
          summary: aiDetailApp.aiSummary,
          breakdown: aiDetailApp.aiBreakdown,
          strengths: aiDetailApp.aiStrengths,
          redFlags: aiDetailApp.aiRedFlags,
        }
      : null;

  const isEmpty = applications.length === 0;

  const columnCommonProps = {
    stages: visibleStages,
    interviewsByApplication,
    notesByApplication,
    onMoveStage,
    onOpen: setSelectedId,
    onAnalizar,
    onScheduleInterview,
    onSendEmail,
    onSendWhatsapp,
    onAddTag,
    onAddNote,
    analyzingIds,
    canConfigureStages,
    onRenameStage,
    onSlaChange,
    onDeleteStage,
    onConsumedAutoFocus: () => setFocusStageId(null),
  };

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
              className="rounded-[var(--radius)] border border-border bg-surface px-3 py-2 text-xs font-medium text-text outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              <option value="name">Nombre</option>
              <option value="days">Más días en la etapa</option>
              <option value="match">Match</option>
            </select>
          )}
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
            <SortableContext
              items={inProcessStages.map((s) => s.id)}
              strategy={horizontalListSortingStrategy}
            >
              {inProcessStages.map((stage) => (
                <SortableStageColumn
                  key={stage.id}
                  {...columnCommonProps}
                  stage={stage}
                  cards={cardsFor(stage.id)}
                  canDrag={canEditPipelineShape}
                  autoFocusName={focusStageId === stage.id}
                />
              ))}
            </SortableContext>
            {canEditPipelineShape && <AddStageTile onAdd={onAddStage} disabled={addingStage} />}
            {closingStages.map((stage) => (
              <StaticStageColumn
                key={stage.id}
                {...columnCommonProps}
                stage={stage}
                cards={cardsFor(stage.id)}
                autoFocusName={focusStageId === stage.id}
              />
            ))}
          </div>

          <DragOverlay>
            {draggingIsColumn && draggingStage ? (
              <section className="flex w-[272px] rotate-1 scale-[1.02] items-center gap-2 rounded-xl bg-surface p-3 px-4 shadow-lg ring-1 ring-primary/20">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: KIND_DOT[draggingStage.kind] }}
                  aria-hidden
                />
                <p className="text-sm font-semibold text-text">{draggingStage.name}</p>
              </section>
            ) : draggingApp ? (
              <PipelineCard
                application={draggingApp}
                stageName={draggingStageForOverlay?.name ?? ""}
                stages={visibleStages}
                interviews={interviewsByApplication[draggingApp.id] ?? []}
                noteCount={notesByApplication[draggingApp.id]?.length ?? 0}
                onMoveStage={noop}
                onOpen={noop}
                onScheduleInterview={noop}
                onSendEmail={noop}
                onSendWhatsapp={noop}
                onAddTag={noop}
                onAddNote={noop}
                isDragOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {selected && (
        <PostuladoDetailSheet
          key={selected.id}
          jobId={jobId}
          postulado={selectedPostulado}
          criterios={criteriosByApplication[selected.id] ?? null}
          screening={screeningByApplication[selected.id] ?? []}
          notes={notesByApplication[selected.id] ?? []}
          stageEvents={stageEventsByApplication[selected.id] ?? []}
          onClose={() => setSelectedId(null)}
          onPasarAlPipeline={noop}
          onGuardarEnPool={onGuardarEnPool}
          onDescartar={onDescartarDesdeSheet}
          onOpenCopiloto={(row) => setAiDetailId(row.id)}
          stageProps={{
            stages: visibleStages,
            currentStageId: selected.stageId,
            onMoveStage,
          }}
        />
      )}

      <AiAnalysisDialog subject={aiDetailSubject} onClose={() => setAiDetailId(null)} />

      <ScheduleInterviewDialog
        key={quickDialog?.kind === "interview" ? quickDialog.applicationId : "interview-closed"}
        applicationId={quickDialog?.kind === "interview" ? quickDialog.applicationId : null}
        jobId={jobId}
        candidateName={quickApp?.candidate.fullName ?? ""}
        interviews={quickApp ? (interviewsByApplication[quickApp.id] ?? []) : []}
        teamMembers={teamMembers}
        onClose={closeQuickDialog}
      />

      <AddNoteDialog
        key={quickDialog?.kind === "note" ? quickDialog.applicationId : "note-closed"}
        applicationId={quickDialog?.kind === "note" ? quickDialog.applicationId : null}
        jobId={jobId}
        candidateName={quickApp?.candidate.fullName ?? ""}
        notes={quickApp ? (notesByApplication[quickApp.id] ?? []) : []}
        onClose={closeQuickDialog}
      />

      <ContactarDialog
        key={quickDialog?.kind === "email" ? quickDialog.applicationId : "email-closed"}
        target={quickDialog?.kind === "email" ? [quickDialog.applicationId] : null}
        jobId={jobId}
        jobTitle={jobTitle}
        fixedChannel="email"
        onClose={closeQuickDialog}
        onSent={closeQuickDialog}
      />

      <SendWhatsappDialog
        key={quickDialog?.kind === "whatsapp" ? quickDialog.applicationId : "whatsapp-closed"}
        target={
          quickDialog?.kind === "whatsapp" && quickApp
            ? { candidateName: quickApp.candidate.fullName, phone: quickApp.candidate.phone }
            : null
        }
        jobTitle={jobTitle}
        onClose={closeQuickDialog}
      />

      <TagsDialog
        key={quickDialog?.kind === "tags" ? quickDialog.applicationId : "tags-closed"}
        candidateId={quickDialog?.kind === "tags" ? (quickApp?.candidate.id ?? null) : null}
        candidateName={quickApp?.candidate.fullName ?? ""}
        jobId={jobId}
        tags={quickApp ? (tagsByCandidate[quickApp.candidate.id] ?? []) : []}
        onClose={closeQuickDialog}
      />
    </div>
  );
}
