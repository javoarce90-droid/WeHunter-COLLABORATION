"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { JobWithStats } from "../data/jobs.queries";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { JOB_STATUS_META, relativeTime } from "./status-meta";
import { STATUS_ACTIONS } from "./status-actions";
import { cambiarEstadoBusquedaAction, duplicarBusquedaAction } from "../actions";
import { JOB_FILTERS, FILTER_LABEL, type JobFilter } from "./job-filters";
import { SearchInput } from "@/components/ui/search-input";
import { FilterChip, FilterChipGroup } from "@/components/ui/filter-chip";

function FilterTabs({
  counts,
  active,
}: {
  counts: Record<JobFilter, number>;
  active: JobFilter;
}) {
  return (
    <FilterChipGroup label="Filtrar búsquedas por estado">
      {JOB_FILTERS.map((key) => (
        <FilterChip
          key={key}
          href={key === "all" ? "/jobs" : `/jobs?status=${key}`}
          active={key === active}
          count={counts[key]}
        >
          {FILTER_LABEL[key]}
        </FilterChip>
      ))}
    </FilterChipGroup>
  );
}

function JobRow({ job }: { job: JobWithStats }) {
  const meta = JOB_STATUS_META[job.status];
  const router = useRouter();
  const [, startTransition] = useTransition();

  function cambiarEstado(to: string) {
    const fd = new FormData();
    fd.set("jobId", job.id);
    fd.set("nuevoEstado", to);
    startTransition(() => cambiarEstadoBusquedaAction(fd));
  }

  function duplicar() {
    const fd = new FormData();
    fd.set("jobId", job.id);
    startTransition(() => duplicarBusquedaAction(fd));
  }

  return (
    <div className="group flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-bg">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link
            href={`/jobs/${job.id}/pipeline`}
            className="truncate rounded-sm font-semibold text-text outline-none transition-colors group-hover:text-primary focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
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
        <Link
          href={`/jobs/${job.id}/pipeline`}
          className="rounded-[var(--radius)] bg-primary-light px-2.5 py-1.5 text-xs font-semibold text-primary-hover outline-none transition-[transform,background-color] duration-150 hover:bg-[color-mix(in_oklab,var(--primary)_18%,white)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] active:scale-[0.98]"
        >
          Pipeline
        </Link>
        <Menu
          align="end"
          trigger={
            <IconButton aria-label={`Acciones de ${job.title}`} size="sm" variant="ghost">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <circle cx="8" cy="3" r="1.4" />
                <circle cx="8" cy="8" r="1.4" />
                <circle cx="8" cy="13" r="1.4" />
              </svg>
            </IconButton>
          }
        >
          {STATUS_ACTIONS[job.status].length > 0 && (
            <>
              <MenuLabel>Cambiar estado</MenuLabel>
              {STATUS_ACTIONS[job.status].map((a) => (
                <MenuItem
                  key={a.to}
                  onClick={() => cambiarEstado(a.to)}
                  destructive={a.to === "closed" || a.to === "archived"}
                >
                  {a.label}
                </MenuItem>
              ))}
              <MenuSeparator />
            </>
          )}
          <MenuItem onClick={() => router.push(`/jobs/${job.id}/edit`)}>Editar</MenuItem>
          <MenuItem onClick={duplicar}>Duplicar</MenuItem>
        </Menu>
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
      <Link href="/jobs/new" className={buttonVariants({ variant: "primary", className: "mt-5" })}>
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
        className="mt-2 inline-block rounded-sm text-sm font-semibold text-primary outline-none hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
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

  // "Todas" no cuenta las archivadas: archivar existe para sacarlas de la vista activa.
  const counts: Record<JobFilter, number> = {
    all: 0,
    open: 0,
    paused: 0,
    draft: 0,
    closed: 0,
    archived: 0,
  };
  for (const job of jobs) {
    counts[job.status] += 1;
    if (job.status !== "archived") counts.all += 1;
  }

  const byStatus =
    filter === "all" ? jobs.filter((j) => j.status !== "archived") : jobs.filter((j) => j.status === filter);
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
              className="mt-2 rounded-sm text-sm font-semibold text-primary outline-none hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <EmptyFilterState active={filter} />
        )
      ) : (
        <div className="animate-fade-in divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
          {visible.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
