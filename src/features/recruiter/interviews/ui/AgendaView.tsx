"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AgendaInterview, SchedulableApplication } from "../data/interviews.queries";
import { MODE_LABELS, STATUS_BADGE, STATUS_LABELS, TYPE_BADGE, TYPE_LABELS } from "../schema";
import { AgendaCalendarGrid } from "./AgendaCalendarGrid";
import { ScheduleInterviewModal, type ScheduleModalMode } from "./ScheduleInterviewModal";
import type { TeamMemberOption } from "./InterviewForm";

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

function InterviewRow({
  interview,
  showDate = false,
  onClick,
}: {
  interview: AgendaInterview;
  showDate?: boolean;
  onClick?: () => void;
}) {
  const muted = interview.status === "cancelled";
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={[
        "flex w-full flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 text-left transition-colors hover:bg-bg",
        onClick ? "cursor-pointer" : "",
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
          <span className="truncate font-semibold text-text">{interview.candidateName}</span>
          <Badge variant={TYPE_BADGE[interview.type]}>{TYPE_LABELS[interview.type]}</Badge>
          <Badge variant={STATUS_BADGE[interview.status]}>{STATUS_LABELS[interview.status]}</Badge>
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <span className="truncate">{interview.jobTitle}</span>
          <span aria-hidden>·</span>
          <span>{MODE_LABELS[interview.mode]}</span>
          {interview.location && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{interview.location}</span>
            </>
          )}
        </p>
      </div>
    </Tag>
  );
}

type DayGroup = { key: string; label: string; items: AgendaInterview[] };

/**
 * Parte la agenda en próximas (agrupadas por día) y pasadas, según el momento actual.
 * Función pura a nivel de datos (no es un componente): acá `Date.now()` es legítimo.
 */
function buildAgenda(interviews: AgendaInterview[]): {
  upcoming: AgendaInterview[];
  past: AgendaInterview[];
  groups: DayGroup[];
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

  return { upcoming, past, groups };
}

type Props = {
  interviews: AgendaInterview[];
  year: number;
  /** 1-12. */
  month: number;
  canWrite: boolean;
  googleConfigured: boolean;
  googleConnectedEmail: string | null;
  schedulableApplications: SchedulableApplication[];
  teamMembers: TeamMemberOption[];
};

export function AgendaView({
  interviews,
  year,
  month,
  canWrite,
  googleConfigured,
  googleConnectedEmail,
  schedulableApplications,
  teamMembers,
}: Props) {
  const [modalMode, setModalMode] = useState<ScheduleModalMode | null>(null);
  const googleConnected = Boolean(googleConnectedEmail);
  const openEdit = canWrite
    ? (interview: AgendaInterview) => setModalMode({ type: "edit", interview })
    : undefined;

  const { upcoming, past, groups } = buildAgenda(interviews);

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

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
        <AgendaCalendarGrid
          year={year}
          month={month}
          interviews={interviews}
          onSelectInterview={openEdit}
        />

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-text">
            Próximas
            <span className="ml-1.5 font-semibold text-muted tabular-nums">{upcoming.length}</span>
          </h2>
          {groups.length === 0 ? (
            <p className="rounded-[var(--radius)] border border-border bg-surface px-5 py-6 text-center text-sm text-muted shadow-[var(--shadow)]">
              No tenés entrevistas próximas.
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
                    {isToday && <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />}
                    {group.label}
                  </h3>
                  <div className="divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
                    {group.items.map((it) => (
                      <InterviewRow key={it.id} interview={it} onClick={openEdit && (() => openEdit(it))} />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>

      {past.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-text">
            Pasadas
            <span className="ml-1.5 font-semibold text-muted tabular-nums">{past.length}</span>
          </h2>
          <div className="divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
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

      <ScheduleInterviewModal
        open={modalMode !== null}
        onClose={() => setModalMode(null)}
        mode={modalMode ?? { type: "new" }}
        schedulableApplications={schedulableApplications}
        teamMembers={teamMembers}
      />
    </div>
  );
}
