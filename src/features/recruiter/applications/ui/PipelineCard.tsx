"use client";

import type { KeyboardEvent } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/icon-button";
import { AiScore, SparkleIcon } from "@/components/ui/ai";
import { Menu, MenuItem } from "@/components/ui/menu";
import { APPLICATION_STAGES, STAGE_LABELS } from "../schema";
import type { ApplicationStage } from "../schema";
import type { ApplicationWithCandidate } from "../data/applications.queries";
import type { InterviewRow } from "@/features/recruiter/interviews/domain/agendar-entrevista";
import { isTerminal, relativeTime } from "./stage-visual";

type Props = {
  application: ApplicationWithCandidate;
  interviews: InterviewRow[];
  noteCount: number;
  onMoveStage: (applicationId: string, toStage: ApplicationStage) => void;
  onOpen: (applicationId: string) => void;
  /** Analiza esta postulación puntual con IA. Se omite (no se muestra el botón) si no se pasa. */
  onAnalizar?: (applicationId: string) => void;
  analyzing?: boolean;
  enteredStageAt?: Date;
  slaDays?: number | null;
  /** true cuando se usa dentro de DragOverlay — deshabilita el drag y los handlers. */
  isDragOverlay?: boolean;
};

const dateFmt = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });

function pickNextInterview(interviews: InterviewRow[]): InterviewRow | undefined {
  const now = Date.now();
  return interviews
    .filter((i) => i.status === "scheduled" && i.scheduledAt.getTime() >= now)
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0];
}

function getSlaStatus(
  enteredStageAt: Date | undefined,
  slaDays: number | null | undefined,
): { status: "over" | "warn"; days: number } | null {
  if (!slaDays || !enteredStageAt) return null;
  const days = Math.floor((Date.now() - enteredStageAt.getTime()) / 86400000);
  if (days >= slaDays) return { status: "over", days };
  if (days >= Math.floor(slaDays * 0.75)) return { status: "warn", days };
  return null;
}

export function PipelineCard({
  application,
  interviews,
  noteCount,
  onMoveStage,
  onOpen,
  onAnalizar,
  analyzing = false,
  enteredStageAt,
  slaDays,
  isDragOverlay = false,
}: Props) {
  const stage = application.stage;
  const terminal = isTerminal(stage);
  const nextInterview = pickNextInterview(interviews);
  const sla = getSlaStatus(enteredStageAt, slaDays);

  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({
    id: application.id,
    disabled: isDragOverlay || terminal,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(application.id);
      return;
    }
    const n = Number(e.key);
    if (n >= 1 && n <= APPLICATION_STAGES.length) {
      const target = APPLICATION_STAGES[n - 1];
      if (!terminal && target !== stage) {
        e.preventDefault();
        onMoveStage(application.id, target);
      }
    }
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      onClick={() => !isDragOverlay && onOpen(application.id)}
      onKeyDown={onKeyDown}
      aria-label={`${application.candidate.fullName}, etapa ${STAGE_LABELS[stage]}. Enter para ver detalle.`}
      {...attributes}
      {...listeners}
      className={[
        "rounded-[var(--radius)] border border-border bg-surface p-3 shadow-[var(--shadow)] outline-none transition-all hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
        !terminal && !isDragOverlay
          ? "touch-none cursor-grab active:cursor-grabbing"
          : "cursor-pointer",
        isDragging && "opacity-40 ring-2 ring-primary/20",
        isDragOverlay && "rotate-1 scale-[1.02] shadow-lg",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start gap-2">
        <Avatar name={application.candidate.fullName} size="sm" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text">
            {application.candidate.fullName}
          </p>
          {application.candidate.email && (
            <p className="truncate text-xs text-muted">{application.candidate.email}</p>
          )}
        </div>

        {/* Score circle de IA si ya se analizó; si no, botón para analizar esta postulación */}
        {application.aiScore != null ? (
          <div className="mt-0.5 shrink-0">
            <AiScore score={application.aiScore} size={24} />
          </div>
        ) : (
          onAnalizar &&
          !isDragOverlay && (
            <IconButton
              aria-label="Analizar con IA"
              title="Calcular compatibilidad con la búsqueda"
              size="sm"
              variant="ghost"
              disabled={analyzing}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onAnalizar(application.id);
              }}
              className="relative mt-0.5 shrink-0 text-primary hover:text-primary-hover"
            >
              {!analyzing && (
                <span className="absolute inset-1 animate-ping rounded-full bg-primary/40" aria-hidden />
              )}
              <SparkleIcon size={13} />
            </IconButton>
          )
        )}

        {!terminal && !isDragOverlay && (
          <Menu
            align="end"
            trigger={
              <IconButton
                aria-label="Más opciones"
                size="sm"
                variant="ghost"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                  <circle cx="8" cy="3" r="1.4" />
                  <circle cx="8" cy="8" r="1.4" />
                  <circle cx="8" cy="13" r="1.4" />
                </svg>
              </IconButton>
            }
          >
            <MenuItem onClick={() => onOpen(application.id)}>Ver ficha</MenuItem>
            {application.aiScore != null && onAnalizar && (
              <MenuItem onClick={() => onAnalizar(application.id)}>Re-analizar con IA</MenuItem>
            )}
          </Menu>
        )}
      </div>

      {/* Indicadores */}
      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span className="tabular-nums">{relativeTime(application.createdAt)}</span>

        {/* SLA badge — color + ícono + aria distinguen vencido de en-riesgo (no solo color) */}
        {sla && (
          <span
            role="status"
            aria-label={
              sla.status === "over"
                ? `SLA vencido: ${sla.days} día${sla.days !== 1 ? "s" : ""} en esta etapa`
                : `Cerca del SLA: ${sla.days} día${sla.days !== 1 ? "s" : ""} en esta etapa`
            }
            className={[
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
              sla.status === "over"
                ? "bg-[#FEE2E2] text-[#991B1B]"
                : "bg-[#FEF3C7] text-[#92400E]",
            ].join(" ")}
            title={
              sla.status === "over"
                ? `SLA vencido — ${sla.days} día${sla.days !== 1 ? "s" : ""} en esta etapa`
                : `Cerca del SLA — ${sla.days} día${sla.days !== 1 ? "s" : ""} en esta etapa`
            }
          >
            {sla.status === "over" ? (
              // Triángulo de alerta = vencido
              <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
                <path d="M6 0.5 11.5 11h-11L6 .5Zm-.6 4v3h1.2v-3H5.4Zm0 4v1.2h1.2V8.5H5.4Z" />
              </svg>
            ) : (
              // Reloj = en curso / en riesgo
              <svg width="9" height="9" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
                <path d="M6 0a6 6 0 1 0 0 12A6 6 0 0 0 6 0Zm.5 6.7L4 8.5l-.8-1L5.5 6V2.5h1V6.7Z" />
              </svg>
            )}
            {sla.days}d
          </span>
        )}

        {noteCount > 0 && (
          <span
            className="inline-flex items-center gap-1"
            title={`${noteCount} nota${noteCount !== 1 ? "s" : ""} interna${noteCount !== 1 ? "s" : ""}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 4h16v12H7l-3 3z" />
            </svg>
            <span className="tabular-nums">{noteCount}</span>
          </span>
        )}

        {nextInterview && (
          <span
            className="inline-flex items-center gap-1 font-medium text-text"
            title="Próxima entrevista"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {dateFmt.format(nextInterview.scheduledAt)}
          </span>
        )}
      </div>
    </article>
  );
}
