import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { AgendaInterview } from "../data/interviews.queries";
import { MODE_LABELS, STATUS_LABELS, type InterviewStatus } from "../schema";

const STATUS_BADGE: Record<InterviewStatus, "blue" | "success" | "muted"> = {
  scheduled: "blue",
  completed: "success",
  cancelled: "muted",
};

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
}: {
  interview: AgendaInterview;
  showDate?: boolean;
}) {
  const muted = interview.status === "cancelled";
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 transition-colors hover:bg-bg">
      <span
        className={[
          "w-[110px] shrink-0 text-sm font-semibold tabular-nums",
          muted ? "text-muted line-through" : "text-text",
        ].join(" ")}
      >
        {showDate
          ? dateTimeFmt.format(interview.scheduledAt)
          : timeFmt.format(interview.scheduledAt)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <Link
            href={`/candidates/${interview.candidateId}`}
            className="truncate font-semibold text-text transition-colors hover:text-primary"
          >
            {interview.candidateName}
          </Link>
          <Badge variant={STATUS_BADGE[interview.status]}>
            {STATUS_LABELS[interview.status]}
          </Badge>
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
          <Link
            href={`/jobs/${interview.jobId}/pipeline`}
            className="truncate hover:text-text"
          >
            {interview.jobTitle}
          </Link>
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
    </div>
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

export function AgendaView({ interviews }: { interviews: AgendaInterview[] }) {
  if (interviews.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-dashed border-primary/25 bg-bg px-6 py-14 text-center">
        <h3 className="font-display text-base font-bold text-text">
          No tenés entrevistas agendadas
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
          Agendá entrevistas desde el pipeline de una búsqueda y van a aparecer acá,
          ordenadas por fecha.
        </p>
        <Link
          href="/jobs"
          className="mt-5 inline-flex items-center justify-center rounded-[var(--radius)] bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Ir a búsquedas
        </Link>
      </div>
    );
  }

  const { upcoming, past, groups } = buildAgenda(interviews);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-bold text-text">
          Próximas
          <span className="ml-1.5 font-semibold text-muted tabular-nums">
            {upcoming.length}
          </span>
        </h2>
        {groups.length === 0 ? (
          <p className="rounded-[var(--radius)] border border-border bg-surface px-5 py-6 text-center text-sm text-muted shadow-[var(--shadow)]">
            No tenés entrevistas próximas.
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.key} className="flex flex-col gap-1.5">
              <h3 className="text-xs font-semibold text-muted first-letter:uppercase">
                {group.label}
              </h3>
              <div className="divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
                {group.items.map((it) => (
                  <InterviewRow key={it.id} interview={it} />
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      {past.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-text">
            Pasadas
            <span className="ml-1.5 font-semibold text-muted tabular-nums">
              {past.length}
            </span>
          </h2>
          <div className="divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
            {past.map((it) => (
              <InterviewRow key={it.id} interview={it} showDate />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
