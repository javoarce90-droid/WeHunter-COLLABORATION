"use client";

import { useState } from "react";
import Link from "next/link";
import type { Job } from "@/db/schema";
import type { JobWithStats } from "../data/jobs.queries";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { JOB_STATUS_META, relativeTime } from "./status-meta";
import { cambiarEstadoBusquedaAction } from "../actions";
import { JOB_FILTERS, FILTER_LABEL, type JobFilter } from "./job-filters";
import { SearchInput } from "@/components/ui/search-input";

type Status = Job["status"];

// Acciones de transición disponibles desde cada estado (label + estado destino).
const STATUS_ACTIONS: Record<Status, { label: string; to: Status }[]> = {
  draft: [{ label: "Publicar", to: "open" }],
  open: [
    { label: "Pausar", to: "paused" },
    { label: "Cerrar", to: "closed" },
  ],
  paused: [
    { label: "Reanudar", to: "open" },
    { label: "Cerrar", to: "closed" },
  ],
  closed: [],
};

function StatusButton({ jobId, label, to }: { jobId: string; label: string; to: Status }) {
  const isClosing = to === "closed";
  return (
    <form action={cambiarEstadoBusquedaAction}>
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="nuevoEstado" value={to} />
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className={isClosing ? "hover:border-danger hover:text-danger" : undefined}
      >
        {label}
      </Button>
    </form>
  );
}

function FilterTabs({
  counts,
  active,
}: {
  counts: Record<JobFilter, number>;
  active: JobFilter;
}) {
  return (
    <nav
      aria-label="Filtrar búsquedas por estado"
      className="flex w-fit max-w-full flex-wrap items-center gap-1 rounded-[var(--radius)] border border-border bg-surface p-1 shadow-[var(--shadow)]"
    >
      {JOB_FILTERS.map((key) => {
        const isActive = key === active;
        return (
          <Link
            key={key}
            href={key === "all" ? "/jobs" : `/jobs?status=${key}`}
            aria-current={isActive ? "page" : undefined}
            className={[
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              isActive
                ? "bg-primary text-white"
                : "text-muted hover:bg-bg hover:text-text",
            ].join(" ")}
          >
            {FILTER_LABEL[key]}
            <span
              className={[
                "tabular-nums",
                isActive ? "text-white/70" : "text-muted/70",
              ].join(" ")}
            >
              {counts[key]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function JobRow({ job }: { job: JobWithStats }) {
  const meta = JOB_STATUS_META[job.status];
  return (
    <div className="group flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-bg">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/jobs/${job.id}/pipeline`}
            className="truncate font-semibold text-text transition-colors group-hover:text-primary"
          >
            {job.title}
          </Link>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
          <span className="font-medium text-text/70 tabular-nums">
            {job.candidateCount}
          </span>
          <span>{job.candidateCount === 1 ? "candidato" : "candidatos"}</span>
          <span aria-hidden>·</span>
          <span>Actualizada {relativeTime(job.updatedAt)}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {STATUS_ACTIONS[job.status].map((a) => (
          <StatusButton key={a.to} jobId={job.id} label={a.label} to={a.to} />
        ))}
        <Link
          href={`/jobs/${job.id}/pipeline`}
          className="rounded-[var(--radius)] bg-primary-light px-2.5 py-1.5 text-xs font-semibold text-primary-hover transition-colors hover:bg-[color-mix(in_oklab,var(--primary)_18%,white)]"
        >
          Pipeline
        </Link>
        <Link
          href={`/jobs/${job.id}/edit`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Editar
        </Link>
      </div>
    </div>
  );
}

function EmptyAllState() {
  return (
    <div className="rounded-[var(--radius)] border border-dashed border-primary/25 bg-bg px-6 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary">
        <PlusGlyph />
      </div>
      <h3 className="mt-4 font-display text-base font-bold text-text">
        Creá tu primera búsqueda
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
        Una búsqueda es el punto de partida: definila y empezá a sumar candidatos a
        su pipeline.
      </p>
      <Link
        href="/jobs/new"
        className="mt-5 inline-flex items-center justify-center rounded-[var(--radius)] bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
      >
        Crear búsqueda
      </Link>
    </div>
  );
}

function EmptyFilterState({ active }: { active: JobFilter }) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface px-6 py-12 text-center shadow-[var(--shadow)]">
      <p className="text-sm text-muted">
        No tenés búsquedas{" "}
        <span className="font-semibold text-text">
          {FILTER_LABEL[active].toLowerCase()}
        </span>
        .
      </p>
      <Link
        href="/jobs"
        className="mt-2 inline-block text-sm font-semibold text-primary hover:text-primary-hover"
      >
        Ver todas
      </Link>
    </div>
  );
}

function PlusGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M10 4v12M4 10h12" />
    </svg>
  );
}

export function JobsList({
  jobs,
  filter,
}: {
  jobs: JobWithStats[];
  filter: JobFilter;
}) {
  const [query, setQuery] = useState("");

  // Sin búsquedas en absoluto → estado de activación (enseña qué es una búsqueda).
  if (jobs.length === 0) {
    return <EmptyAllState />;
  }

  const counts: Record<JobFilter, number> = {
    all: jobs.length,
    open: 0,
    paused: 0,
    draft: 0,
    closed: 0,
  };
  for (const job of jobs) counts[job.status] += 1;

  const byStatus = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);
  const q = query.trim().toLowerCase();
  const visible = q
    ? byStatus.filter((j) => j.title.toLowerCase().includes(q))
    : byStatus;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterTabs counts={counts} active={filter} />
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Buscar por título…"
          aria-label="Buscar búsquedas por título"
        />
      </div>
      {visible.length === 0 ? (
        q ? (
          <div className="rounded-[var(--radius)] border border-border bg-surface px-6 py-12 text-center shadow-[var(--shadow)]">
            <p className="text-sm text-muted">
              Ninguna búsqueda coincide con{" "}
              <span className="font-semibold text-text">“{query}”</span>.
            </p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-2 text-sm font-semibold text-primary hover:text-primary-hover"
            >
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <EmptyFilterState active={filter} />
        )
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
          {visible.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
