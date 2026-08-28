"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import type {
  AgendaInterview,
  SchedulableApplication,
  JobStageOption,
} from "../data/interviews.queries";
import { MODE_LABELS, STATUS_BADGE, STATUS_LABELS, TYPE_BADGE, TYPE_LABELS } from "../schema";
import { encontrarSolapamientos, type SolapamientoCandidate } from "../domain/detectar-solapamiento";
import { ScheduleInterviewModal, type ScheduleModalMode } from "./ScheduleInterviewModal";
import { AgendaFilters, type AgendaJobOption } from "./AgendaFilters";
import { DEFAULT_AGENDA_RANGE, type AgendaRange } from "./agenda-filters";
import type { TeamMemberOption } from "./InterviewForm";
import { InterviewReportButton } from "@/features/recruiter/interview-reports/ui/InterviewReportButton";
import { puedeGenerarInforme } from "@/features/recruiter/interview-reports/domain/generar-informe-entrevista";

const timeFmt = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
});
const dateTimeFmt = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const weekdayFmt = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function ConflictBadge({ conflicts }: { conflicts: SolapamientoCandidate[] }) {
  const label =
    conflicts.length === 1
      ? `Se superpone con ${conflicts[0].candidateName} a las ${timeFmt.format(conflicts[0].scheduledAt)}.`
      : `Se superpone con ${conflicts.length} entrevistas más.`;
  return (
    <Tooltip label={label} align="start">
      <span
        role="status"
        aria-label={`Conflicto de horario: ${label}`}
        className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-semibold text-[#92400E]"
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
          <path d="M6 0.5 11.5 11h-11L6 .5Zm-.6 4v3h1.2v-3H5.4Zm0 4v1.2h1.2V8.5H5.4Z" />
        </svg>
        Conflicto
      </span>
    </Tooltip>
  );
}

function InterviewRow({
  interview,
  showDate = false,
  conflicts,
  onClick,
}: {
  interview: AgendaInterview;
  showDate?: boolean;
  /** Otras entrevistas cuyo horario se solapa con esta (ver `encontrarSolapamientos`) — solo
   *  tiene sentido para "Próximas" (lo pasado ya no se puede reagendar). */
  conflicts?: SolapamientoCandidate[];
  onClick?: () => void;
}) {
  const muted = interview.status === "cancelled";
  // `<div>`, no `<button>`: esta fila contiene botones reales (informe de entrevista) y un
  // `<button>` no puede tener otro `<button>` como descendiente (error de hidratación real,
  // no solo de estilo). `role="button"` + `tabIndex` + Enter/Espacio igualan la semántica y
  // el teclado de un botón nativo.
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={[
        "flex w-full flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 text-left outline-none transition-colors hover:bg-bg",
        onClick ? "cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring)]" : "",
      ].join(" ")}
    >
      <span
        className={[
          "w-[140px] shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums",
          muted ? "text-muted line-through" : "text-text",
        ].join(" ")}
      >
        {showDate
          ? dateTimeFmt.format(interview.scheduledAt)
          : timeFmt.format(interview.scheduledAt)}
      </span>

      <Avatar name={interview.candidateName} size="sm" className={muted ? "opacity-60" : ""} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Link
            href={`/candidates/${interview.candidateId}`}
            onClick={(e) => e.stopPropagation()}
            className="truncate rounded-sm font-semibold text-text outline-none hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            {interview.candidateName}
          </Link>
          <Badge variant={TYPE_BADGE[interview.type] ?? "blue"}>
            {TYPE_LABELS[interview.type] ?? interview.type}
          </Badge>
          <Badge variant={STATUS_BADGE[interview.status]}>{STATUS_LABELS[interview.status]}</Badge>
          {conflicts && conflicts.length > 0 && <ConflictBadge conflicts={conflicts} />}
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <span className="truncate">{interview.jobTitle}</span>
          <span aria-hidden>·</span>
          <span>{MODE_LABELS[interview.mode]}</span>
          {interview.location && (
            <>
              <span aria-hidden>·</span>
              {interview.location.startsWith("http") ? (
                <a
                  href={interview.location}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="truncate text-primary hover:text-primary-hover hover:underline"
                >
                  {interview.location}
                </a>
              ) : (
                <span className="truncate">{interview.location}</span>
              )}
            </>
          )}
        </p>
      </div>

      {/* El informe solo existe para entrevistas ya realizadas — en las próximas el botón
       *  estaría siempre deshabilitado (ver `puedeGenerarInforme`), así que no se muestra. */}
      {puedeGenerarInforme(
        { scheduledAt: interview.scheduledAt, status: interview.status },
        new Date(),
      ) && (
        <div className="shrink-0">
          <InterviewReportButton
            interviewId={interview.id}
            candidateName={interview.candidateName}
            scheduledAt={interview.scheduledAt}
            status={interview.status}
            stopPropagation
          />
        </div>
      )}
    </div>
  );
}

type DayGroup = { key: string; label: string; items: AgendaInterview[] };

/**
 * Parte la agenda en próximas (agrupadas por día) y pasadas, según el momento actual, y
 * calcula qué entrevistas próximas se solapan entre sí (ventanas de ~1h). Función pura a
 * nivel de datos (no es un componente): acá `Date.now()` es legítimo.
 */
function buildAgenda(interviews: AgendaInterview[]): {
  upcoming: AgendaInterview[];
  past: AgendaInterview[];
  groups: DayGroup[];
  conflictsById: Map<string, SolapamientoCandidate[]>;
} {
  const now = Date.now();
  const upcoming = interviews.filter((i) => i.scheduledAt.getTime() >= now);
  const past = interviews.filter((i) => i.scheduledAt.getTime() < now).reverse();

  const todayKey = dayKey(new Date(now));
  const tomorrowKey = dayKey(new Date(now + 86_400_000));

  const groups: DayGroup[] = [];
  for (const it of upcoming) {
    const key = dayKey(it.scheduledAt);
    let group = groups.find((g) => g.key === key);
    if (!group) {
      const label =
        key === todayKey
          ? "Hoy"
          : key === tomorrowKey
            ? "Mañana"
            : weekdayFmt.format(it.scheduledAt);
      group = { key, label, items: [] };
      groups.push(group);
    }
    group.items.push(it);
  }

  const conflictsById = new Map<string, SolapamientoCandidate[]>();
  for (const it of upcoming) {
    const conflicts = encontrarSolapamientos(it.scheduledAt, upcoming, it.id);
    if (conflicts.length > 0) conflictsById.set(it.id, conflicts);
  }

  return { upcoming, past, groups, conflictsById };
}

type Props = {
  interviews: AgendaInterview[];
  jobOptions: AgendaJobOption[];
  /** Todas las entrevistas de la org (sin filtrar) en forma mínima — para el aviso de
   *  solapamiento al agendar/editar, que no debe depender de los filtros de pantalla. */
  conflictCandidates: SolapamientoCandidate[];
  filters: { jobId: string | null; q: string };
  range: AgendaRange;
  canWrite: boolean;
  googleConfigured: boolean;
  googleConnectedEmail: string | null;
  schedulableApplications: SchedulableApplication[];
  jobStagesByJob: Record<string, JobStageOption[]>;
  teamMembers: TeamMemberOption[];
};

export function AgendaView({
  interviews,
  jobOptions,
  conflictCandidates,
  filters,
  range,
  canWrite,
  googleConfigured,
  googleConnectedEmail,
  schedulableApplications,
  jobStagesByJob,
  teamMembers,
}: Props) {
  const [modalMode, setModalMode] = useState<ScheduleModalMode | null>(null);
  const googleConnected = Boolean(googleConnectedEmail);
  const openEdit = canWrite
    ? (interview: AgendaInterview) => setModalMode({ type: "edit", interview })
    : undefined;

  const { upcoming, past, groups, conflictsById } = buildAgenda(interviews);

  const hasActiveFilters =
    filters.jobId !== null || filters.q.trim() !== "" || range !== DEFAULT_AGENDA_RANGE;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {googleConnected ? (
          <span className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[#A6F4C5] bg-[#ECFDF3] px-3 py-1.5 text-xs font-semibold text-[#067647]">
            <span className="h-2 w-2 rounded-full bg-[#12B76A]" aria-hidden />
            Conectado como {googleConnectedEmail}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-[#FDE9B8] bg-[#FEF9EC] px-3 py-1.5 text-xs font-semibold text-[#92400E]">
            <span className="h-2 w-2 rounded-full bg-[#F59E0B]" aria-hidden />
            Sin conectar
          </span>
        )}
        {canWrite && (
          <Button
            type="button"
            className="ml-auto"
            disabled={!googleConnected}
            title={googleConnected ? undefined : "Conectá primero tu calendario"}
            onClick={() => setModalMode({ type: "new" })}
          >
            Agendar entrevista
          </Button>
        )}
      </div>

      {!googleConnected && (
        <div className="flex flex-wrap items-center gap-4 rounded-[var(--radius)] border border-[#D9C7F3] bg-gradient-to-br from-[#F3EDFC] to-[#EAF1FE] px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-text">Conectá tu Google Calendar</p>
            <p className="mt-0.5 text-xs text-muted">
              Cada persona conecta su propia cuenta de Google — agendá entrevistas que se
              sincronizan solas, con invitaciones automáticas.
            </p>
          </div>
          {googleConfigured ? (
            <a
              href="/settings/google-calendar/connect"
              className="shrink-0 rounded-[var(--radius)] bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Conectar con Google
            </a>
          ) : (
            <Badge variant="muted" className="shrink-0">
              Sin configurar
            </Badge>
          )}
        </div>
      )}

      <AgendaFilters
        jobOptions={jobOptions}
        jobId={filters.jobId}
        query={filters.q}
        range={range}
      />

      {interviews.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-border bg-bg px-5 py-10 text-center">
          <p className="text-sm text-muted">
            {hasActiveFilters
              ? "Ninguna entrevista coincide con los filtros."
              : "Todavía no tenés entrevistas agendadas."}
          </p>
          {hasActiveFilters && (
            <Link
              href="/agenda"
              className="mt-2 inline-block rounded-sm text-sm font-semibold text-primary outline-none hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              Limpiar filtros
            </Link>
          )}
        </div>
      ) : (
        <>
          {range !== "past" && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-bold text-text">
                Próximas
                <span className="ml-1.5 font-semibold text-muted tabular-nums">
                  {upcoming.length}
                </span>
              </h2>
              {groups.length === 0 ? (
                <p className="rounded-[var(--radius)] border border-dashed border-border bg-bg px-5 py-6 text-center text-sm text-muted">
                  {hasActiveFilters
                    ? "No hay entrevistas próximas en este rango."
                    : "No tenés entrevistas próximas."}
                </p>
              ) : (
                groups.map((group) => {
                  const isToday = group.label === "Hoy";
                  return (
                    <div key={group.key} className="flex flex-col gap-1.5">
                      <h3
                        className={[
                          "flex items-center gap-1.5 text-xs font-semibold first-letter:uppercase",
                          isToday ? "text-primary" : "text-muted",
                        ].join(" ")}
                      >
                        {isToday && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                        )}
                        {group.label}
                      </h3>
                      <div className="divide-y divide-border overflow-x-clip rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)] [&>*:first-child]:rounded-t-[var(--radius)] [&>*:last-child]:rounded-b-[var(--radius)]">
                        {group.items.map((it) => (
                          <InterviewRow
                            key={it.id}
                            interview={it}
                            conflicts={conflictsById.get(it.id)}
                            onClick={openEdit && (() => openEdit(it))}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </section>
          )}

          {past.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-bold text-text">
                Pasadas
                <span className="ml-1.5 font-semibold text-muted tabular-nums">{past.length}</span>
              </h2>
              <div className="divide-y divide-border overflow-x-clip rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)] [&>*:first-child]:rounded-t-[var(--radius)] [&>*:last-child]:rounded-b-[var(--radius)]">
                {past.map((it) => (
                  <InterviewRow
                    key={it.id}
                    interview={it}
                    showDate
                    onClick={openEdit && (() => openEdit(it))}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <ScheduleInterviewModal
        open={modalMode !== null}
        onClose={() => setModalMode(null)}
        mode={modalMode ?? { type: "new" }}
        schedulableApplications={schedulableApplications}
        jobStagesByJob={jobStagesByJob}
        teamMembers={teamMembers}
        allInterviews={conflictCandidates}
      />
    </div>
  );
}
