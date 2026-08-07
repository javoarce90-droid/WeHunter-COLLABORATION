"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { JobWithStats, JobStatusCounts } from "../data/jobs.queries";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { Pagination } from "@/components/ui/pagination";
import { JOB_STATUS_META, relativeTime } from "./status-meta";
import { STATUS_ACTIONS } from "./status-actions";
import { PublishConfirmDialog } from "./PublishConfirmButton";
import { PRIORITY_LABELS, PRIORITY_BADGE } from "./field-meta";
import {
  cambiarEstadoBusquedaAction,
  duplicarBusquedaAction,
  registrarCompartidaBusquedaAction,
} from "../actions";
import {
  JOB_FILTERS,
  FILTER_LABEL,
  JOB_SORT_KEYS,
  SORT_LABEL,
  DEFAULT_JOB_SORT,
  type JobFilter,
  type JobSortKey,
} from "./job-filters";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { FilterChip, FilterChipGroup } from "@/components/ui/filter-chip";
import { useToast } from "@/lib/toast";

const SEARCH_DEBOUNCE_MS = 350;

/** Arma la URL de /jobs preservando filtro/búsqueda/orden — única fuente de verdad para los
 *  4 lugares que navegan esta pantalla (chips de estado, buscador, selector de orden, paginación). */
function buildJobsHref(
  filter: JobFilter,
  query: string,
  sort: JobSortKey,
  page: number,
): string {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("status", filter);
  if (query) params.set("q", query);
  if (sort !== DEFAULT_JOB_SORT) params.set("sort", sort);
  if (page > 1) params.set("page", String(page));
  return params.size ? `/jobs?${params}` : "/jobs";
}

function FilterTabs({
  counts,
  active,
  query,
  sort,
}: {
  counts: Record<JobFilter, number>;
  active: JobFilter;
  query: string;
  sort: JobSortKey;
}) {
  return (
    <FilterChipGroup label="Filtrar búsquedas por estado" wrap={false}>
      {JOB_FILTERS.map((key) => (
        <FilterChip
          key={key}
          href={buildJobsHref(key, query, sort, 1)}
          active={key === active}
          count={counts[key]}
        >
          {FILTER_LABEL[key]}
        </FilterChip>
      ))}
    </FilterChipGroup>
  );
}

/** Selector "Ordenar por". Cada opción tiene dirección fija (ver job-filters.ts) — navega
 *  reseteando a la página 1, preservando filtro y búsqueda. */
function JobsSortSelect({
  filter,
  query,
  sort,
}: {
  filter: JobFilter;
  query: string;
  sort: JobSortKey;
}) {
  const router = useRouter();
  return (
    <Select
      aria-label="Ordenar búsquedas por"
      value={sort}
      onChange={(e) =>
        router.replace(
          buildJobsHref(filter, query, e.target.value as JobSortKey, 1),
        )
      }
      className="h-10 w-auto shrink-0 !py-2"
    >
      {JOB_SORT_KEYS.map((key) => (
        <option key={key} value={key}>
          {SORT_LABEL[key]}
        </option>
      ))}
    </Select>
  );
}

/** Buscador URL-driven (?q=): sube el texto tipeado a la URL con debounce, siempre reseteando
 *  a la página 1 — la búsqueda tiene que filtrar contra TODA la búsqueda, no solo la página
 *  visible, así que ya no puede ser puramente client-side como antes. El caller lo remonta con
 *  `key={initialQuery}` cuando el valor cambia por afuera (navegación), en vez de sincronizar
 *  con un efecto (evita el cascading-render que marca react-hooks/set-state-in-effect). */
function JobsSearchInput({
  filter,
  sort,
  initialQuery,
}: {
  filter: JobFilter;
  sort: JobSortKey;
  initialQuery: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  function handleChange(next: string) {
    setValue(next);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      router.replace(buildJobsHref(filter, next.trim(), sort, 1), {
        scroll: false,
      });
    }, SEARCH_DEBOUNCE_MS);
  }

  return (
    <SearchInput
      value={value}
      onChange={handleChange}
      placeholder="Buscar por título…"
      aria-label="Buscar búsquedas por título"
    />
  );
}

function JobRow({
  job,
  orgSlug,
  canManage,
}: {
  job: JobWithStats;
  orgSlug: string | null;
  canManage: boolean;
}) {
  const meta = JOB_STATUS_META[job.status];
  const router = useRouter();
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [confirmPublish, setConfirmPublish] = useState(false);

  function cambiarEstado(to: string) {
    const fd = new FormData();
    fd.set("jobId", job.id);
    fd.set("nuevoEstado", to);
    startTransition(() => cambiarEstadoBusquedaAction(fd));
  }

  function copiarLink() {
    if (!orgSlug) return;
    navigator.clipboard.writeText(
      `${window.location.origin}/careers/${orgSlug}/${job.id}`,
    );
    toast({
      message: "Link de la búsqueda copiado al portapapeles",
      variant: "success",
    });
    const fd = new FormData();
    fd.set("jobId", job.id);
    startTransition(() => registrarCompartidaBusquedaAction(fd));
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
            href={`/jobs/${job.id}/postulados`}
            className="truncate rounded-sm font-semibold text-text outline-none transition-colors group-hover:text-primary focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            {job.title}
          </Link>
          <Badge variant={meta.variant}>{meta.label}</Badge>
          {job.priority && (
            <Badge variant={PRIORITY_BADGE[job.priority]} title="Prioridad">
              {PRIORITY_LABELS[job.priority]}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted">
          <span className="font-medium text-text/70 tabular-nums">
            {job.viewCount}
          </span>
          <span>{job.viewCount === 1 ? "visita" : "visitas"}</span>
          <span aria-hidden>·</span>
          <span className="font-medium text-text/70 tabular-nums">
            {job.receivedCount}
          </span>
          <span>
            {job.receivedCount === 1 ? "postulación" : "postulaciones"}
          </span>
          {job.pendingCount > 0 && (
            <>
              <span aria-hidden>·</span>
              <Link
                href={`/jobs/${job.id}/postulados`}
                className="rounded-sm font-semibold text-primary outline-none hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                <span className="tabular-nums">{job.pendingCount}</span> sin
                revisar
              </Link>
            </>
          )}
          <span aria-hidden>·</span>
          <span className="font-medium text-text/70 tabular-nums">
            {job.shareCount}
          </span>
          <span>{job.shareCount === 1 ? "compartida" : "compartidas"}</span>
          <span aria-hidden>·</span>
          <span>Actualizada {relativeTime(job.updatedAt)}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {job.assigneeName && (
          <div
            className="flex items-center gap-1.5"
            title={`Asignada a ${job.assigneeName}`}
          >
            <Avatar name={job.assigneeName} size="sm" />
            <span className="text-xs text-muted">
              {job.assigneeName.split(" ")[0]}
            </span>
          </div>
        )}
        {(canManage || job.status === "open") && (
          <Menu
            align="end"
            trigger={
              <IconButton
                aria-label={`Acciones de ${job.title}`}
                size="sm"
                variant="ghost"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  aria-hidden
                >
                  <circle cx="8" cy="3" r="1.4" />
                  <circle cx="8" cy="8" r="1.4" />
                  <circle cx="8" cy="13" r="1.4" />
                </svg>
              </IconButton>
            }
          >
            {canManage && STATUS_ACTIONS[job.status].length > 0 && (
              <>
                <MenuLabel>Cambiar estado</MenuLabel>
                {STATUS_ACTIONS[job.status].map((a) => (
                  <MenuItem
                    key={a.to}
                    onClick={() =>
                      a.to === "open"
                        ? setConfirmPublish(true)
                        : cambiarEstado(a.to)
                    }
                    destructive={a.to === "closed" || a.to === "archived"}
                  >
                    {a.label}
                  </MenuItem>
                ))}
                <MenuSeparator />
              </>
            )}
            {canManage && (
              <>
                <MenuItem onClick={() => router.push(`/jobs/${job.id}/edit`)}>
                  Editar
                </MenuItem>
                <MenuItem onClick={duplicar}>Duplicar</MenuItem>
              </>
            )}
            {job.status === "open" && (
              <MenuItem onClick={copiarLink} disabled={!orgSlug}>
                Compartir / Copiar link
              </MenuItem>
            )}
          </Menu>
        )}
        <PublishConfirmDialog
          open={confirmPublish}
          onClose={() => setConfirmPublish(false)}
          jobId={job.id}
          jobTitle={job.title}
        />
      </div>
    </div>
  );
}

function EmptyAllState({ canManage }: { canManage: boolean }) {
  return (
    <div className="rounded-[var(--radius)] border border-dashed border-primary/25 bg-bg px-6 py-14 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary">
        <PlusGlyph />
      </div>
      <h3 className="mt-4 font-display text-base font-bold text-text">
        {canManage
          ? "Creá tu primera búsqueda"
          : "Todavía no tenés búsquedas asignadas"}
      </h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
        {canManage
          ? "Una búsqueda es el punto de partida: definila y empezá a sumar candidatos a su pipeline."
          : "Cuando te asignen una como responsable o sourcer, va a aparecer acá."}
      </p>
      {canManage && (
        <Link
          href="/jobs/new"
          className={buttonVariants({ variant: "primary", className: "mt-5" })}
        >
          Crear búsqueda
        </Link>
      )}
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
  query,
  counts,
  page,
  totalPages,
  sort,
  orgSlug,
  canManage,
}: {
  jobs: JobWithStats[];
  filter: JobFilter;
  query: string;
  counts: JobStatusCounts;
  page: number;
  totalPages: number;
  sort: JobSortKey;
  orgSlug: string | null;
  canManage: boolean;
}) {
  const router = useRouter();

  // Sin ninguna búsqueda en la org (ni siquiera archivada) → estado de activación.
  if (counts.all === 0) {
    return <EmptyAllState canManage={canManage} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="mb-6 flex items-center justify-between gap-4">
        <FilterTabs counts={counts} active={filter} query={query} sort={sort} />
        <div className="flex shrink-0 items-center gap-3">
          <div className="w-64">
            <JobsSearchInput
              key={query}
              filter={filter}
              sort={sort}
              initialQuery={query}
            />
          </div>
          <JobsSortSelect filter={filter} query={query} sort={sort} />
        </div>
      </div>
      {jobs.length === 0 ? (
        query ? (
          <div className="rounded-[var(--radius)] border border-border bg-surface px-6 py-12 text-center shadow-[var(--shadow)]">
            <p className="text-sm text-muted">
              Ninguna búsqueda coincide con{" "}
              <span className="font-semibold text-text">“{query}”</span>.
            </p>
            <button
              type="button"
              onClick={() => router.replace(buildJobsHref(filter, "", sort, 1))}
              className="mt-2 rounded-sm text-sm font-semibold text-primary outline-none hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <EmptyFilterState active={filter} />
        )
      ) : (
        <>
          <div className="animate-fade-in divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
            {jobs.map((job) => (
              <JobRow
                key={job.id}
                job={job}
                orgSlug={orgSlug}
                canManage={canManage}
              />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            buildHref={(p) => buildJobsHref(filter, query, sort, p)}
          />
        </>
      )}
    </div>
  );
}
