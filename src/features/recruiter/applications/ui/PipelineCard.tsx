"use client";

import type { KeyboardEvent } from "react";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/icon-button";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu";
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
};

const dateFmt = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });

/** Próxima entrevista agendada (módulo, no render: evita Date.now en el cuerpo del componente). */
function pickNextInterview(interviews: InterviewRow[]): InterviewRow | undefined {
  const now = Date.now();
  return interviews
    .filter((i) => i.status === "scheduled" && i.scheduledAt.getTime() >= now)
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0];
}

/**
 * Card liviana y escaneable (PRODUCT.md "densidad útil": el reclutador escanea, no lee).
 * Lo profundo —notas, entrevistas— vive en el panel lateral, no acá. Mover de etapa:
 * menú compacto + atajos 1–6 con la card enfocada. Click abre el detalle.
 */
export function PipelineCard({
  application,
  interviews,
  noteCount,
  onMoveStage,
  onOpen,
}: Props) {
  const stage = application.stage;
  const terminal = isTerminal(stage);
  const nextInterview = pickNextInterview(interviews);

  // Atajos 1–6 mueven la card enfocada a la etapa N; Enter/Espacio abre el detalle.
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
      tabIndex={0}
      onClick={() => onOpen(application.id)}
      onKeyDown={onKeyDown}
      aria-label={`${application.candidate.fullName}, etapa ${STAGE_LABELS[stage]}. Enter para ver detalle.`}
      className="group cursor-pointer rounded-[var(--radius)] border border-border bg-surface p-3 shadow-[var(--shadow)] outline-none transition-all hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
    >
      <div className="flex items-start gap-2.5">
        <Avatar name={application.candidate.fullName} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text">
            {application.candidate.fullName}
          </p>
          {application.candidate.email && (
            <p className="truncate text-xs text-muted">{application.candidate.email}</p>
          )}
        </div>
        {!terminal && (
          <Menu
            align="end"
            trigger={
              <IconButton
                aria-label="Mover de etapa"
                size="sm"
                variant="ghost"
                // Evita que el click del menú dispare el onClick de la card.
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
            <MenuLabel>Mover a</MenuLabel>
            {APPLICATION_STAGES.filter((s) => s !== stage).map((s) => (
              <MenuItem
                key={s}
                destructive={s === "rejected"}
                onClick={() => onMoveStage(application.id, s)}
              >
                {STAGE_LABELS[s]}
              </MenuItem>
            ))}
            <MenuSeparator />
            <MenuItem onClick={() => onOpen(application.id)}>Ver detalle…</MenuItem>
          </Menu>
        )}
      </div>

      {/* Indicadores: en vez de embeber notas/entrevistas, las resumimos con iconos. */}
      <div className="mt-2.5 flex items-center gap-3 text-xs text-muted">
        <span className="tabular-nums">{relativeTime(application.createdAt)}</span>
        {noteCount > 0 && (
          <span className="inline-flex items-center gap-1" title={`${noteCount} nota${noteCount !== 1 ? "s" : ""} interna${noteCount !== 1 ? "s" : ""}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 4h16v12H7l-3 3z" />
            </svg>
            <span className="tabular-nums">{noteCount}</span>
          </span>
        )}
        {nextInterview && (
          <span className="inline-flex items-center gap-1 font-medium text-text" title="Próxima entrevista">
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
