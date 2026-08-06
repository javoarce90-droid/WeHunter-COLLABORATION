"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Candidate } from "@/db/schema";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { FilterChip, FilterChipGroup } from "@/components/ui/filter-chip";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { IconButton } from "@/components/ui/icon-button";
import { Pagination } from "@/components/ui/pagination";
import { useToast } from "@/lib/toast";
import { normalizeIfUncapitalized } from "@/lib/text";
import { postularVariosAction } from "@/features/recruiter/applications/actions";
import { cambiarEstadoTalentoAction } from "../actions";
import { CANDIDATE_SOURCE_LABELS } from "./source-meta";
import {
  TALENT_STATE_LABELS,
  TALENT_STATE_BADGE,
  TALENT_STATE_ORDER,
} from "./talent-meta";
import type { CandidateSource } from "../domain/candidate-details";
import type { TalentState } from "../domain/cambiar-estado-talento";
import type {
  CandidateFilterKey,
  CandidateFilterCounts,
} from "../data/candidates.queries";

type JobOption = { id: string; title: string };

const SEARCH_DEBOUNCE_MS = 350;

interface Props {
  candidates: Candidate[];
  jobs: JobOption[];
  filter: CandidateFilterKey;
  query: string;
  counts: CandidateFilterCounts;
  duplicateIds: string[];
  page: number;
  totalPages: number;
}

function sourceLabel(source: string | null): string {
  if (!source) return "—";
  return CANDIDATE_SOURCE_LABELS[source as CandidateSource] ?? source;
}

function buildCandidatesHref(
  filter: CandidateFilterKey,
  query: string,
  page: number,
): string {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("filter", filter);
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  return params.size ? `/candidates?${params}` : "/candidates";
}

/** Buscador URL-driven (?q=): igual que en Búsquedas, la búsqueda tiene que filtrar contra
 *  TODO el pool, no solo la página visible, así que ya no puede ser client-side puro. El
 *  caller lo remonta con `key={query}` cuando el valor cambia por afuera (navegación). */
function CandidatesSearchInput({
  filter,
  initialQuery,
}: {
  filter: CandidateFilterKey;
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
      router.replace(buildCandidatesHref(filter, next.trim(), 1), {
        scroll: false,
      });
    }, SEARCH_DEBOUNCE_MS);
  }

  return (
    <SearchInput
      value={value}
      onChange={handleChange}
      placeholder="Buscar por nombre o email…"
      aria-label="Buscar candidatos"
    />
  );
}

export function CandidatesList({
  candidates,
  jobs,
  filter,
  query,
  counts,
  duplicateIds,
  page,
  totalPages,
}: Props) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quickView, setQuickView] = useState<Candidate | null>(null);

  const [rows, applyState] = useOptimistic(
    candidates,
    (state, patch: { id: string; talentState: TalentState }) =>
      state.map((c) =>
        c.id === patch.id ? { ...c, talentState: patch.talentState } : c,
      ),
  );
  const duplicateIdSet = new Set(duplicateIds);

  if (counts.all === 0) {
    return (
      <EmptyState
        title="Tu pool está vacío"
        description="Cargá el primer candidato para empezar a armar tus búsquedas."
        action={{ label: "Cargar candidato", href: "/candidates/new" }}
      />
    );
  }

  const visible = rows;
  const allVisibleSelected =
    visible.length > 0 && visible.every((c) => selected.has(c.id));
  const someVisibleSelected = visible.some((c) => selected.has(c.id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visible.forEach((c) => next.delete(c.id));
      else visible.forEach((c) => next.add(c.id));
      return next;
    });
  }

  function setState(c: Candidate, talentState: TalentState) {
    startTransition(async () => {
      applyState({ id: c.id, talentState });
      const res = await cambiarEstadoTalentoAction(c.id, talentState);
      if (!res.ok)
        toast({
          message: res.error ?? "No se pudo cambiar.",
          variant: "danger",
        });
      else
        toast({
          message: `${c.fullName} → ${TALENT_STATE_LABELS[talentState]}`,
          variant: "success",
        });
    });
  }

  const CHIPS: { key: CandidateFilterKey; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "active", label: TALENT_STATE_LABELS.active },
    { key: "passive", label: TALENT_STATE_LABELS.passive },
    { key: "contacted", label: TALENT_STATE_LABELS.contacted },
    { key: "archived", label: TALENT_STATE_LABELS.archived },
    { key: "duplicates", label: "Duplicados" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CandidatesSearchInput
          key={query}
          filter={filter}
          initialQuery={query}
        />
        <p className="text-sm text-muted">
          {visible.length} de {counts[filter]}
        </p>
      </div>

      {/* Filter chips por estado operativo + duplicados */}
      <FilterChipGroup label="Filtrar candidatos por estado">
        {CHIPS.map((chip) => {
          const n = counts[chip.key];
          const isDup = chip.key === "duplicates";
          return (
            <FilterChip
              key={chip.key}
              href={buildCandidatesHref(chip.key, query, 1)}
              active={filter === chip.key}
              count={n}
              tone={isDup && n > 0 ? "danger" : undefined}
            >
              {chip.label}
            </FilterChip>
          );
        })}
      </FilterChipGroup>

      {/* Barra de selección (bulk postular) */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-primary/30 bg-primary-light px-4 py-2.5">
          <span className="text-sm font-semibold text-primary-hover">
            {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
          </span>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            Postular a búsqueda…
          </Button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-sm font-semibold text-muted hover:text-text"
          >
            Limpiar
          </button>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border bg-surface px-6 py-12 text-center text-sm text-muted shadow-[var(--shadow)]">
          {filter === "duplicates"
            ? "No se detectaron duplicados por email o LinkedIn."
            : query
              ? `Ningún candidato coincide con “${query}”.`
              : "Ningún candidato coincide con el filtro."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="w-10 py-2.5 pl-4">
                  <Checkbox
                    checked={allVisibleSelected}
                    aria-label="Seleccionar todos"
                    ref={(el) => {
                      if (el)
                        el.indeterminate =
                          !allVisibleSelected && someVisibleSelected;
                    }}
                    onChange={toggleAll}
                  />
                </th>
                <th className="py-2.5 pr-3 text-xs font-semibold uppercase tracking-wide text-label">
                  Candidato
                </th>
                <th className="hidden py-2.5 pr-3 text-xs font-semibold uppercase tracking-wide text-label md:table-cell">
                  Fuente
                </th>
                <th className="py-2.5 pr-3 text-xs font-semibold uppercase tracking-wide text-label">
                  Estado
                </th>
                <th className="py-2.5 pr-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((candidate) => {
                const isSelected = selected.has(candidate.id);
                const isDup = duplicateIdSet.has(candidate.id);
                return (
                  <tr
                    key={candidate.id}
                    className={[
                      "transition-colors",
                      isSelected ? "bg-[var(--selected-bg)]" : "hover:bg-bg",
                    ].join(" ")}
                  >
                    <td className="py-2.5 pl-4">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleOne(candidate.id)}
                        aria-label={`Seleccionar ${candidate.fullName}`}
                      />
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={candidate.fullName} size="sm" />
                        <button
                          type="button"
                          onClick={() => setQuickView(candidate)}
                          className="truncate text-left font-semibold text-text transition-colors hover:text-primary"
                        >
                          {candidate.fullName}
                        </button>
                        {candidate.cvUrl && <Badge variant="blue">CV</Badge>}
                        {isDup && (
                          <Badge
                            variant="danger"
                            title="Comparte email o LinkedIn con otro candidato"
                          >
                            Duplicado
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="hidden py-2.5 pr-3 text-muted md:table-cell">
                      {sourceLabel(candidate.source)}
                    </td>
                    <td className="py-2.5 pr-3">
                      <Badge
                        variant={
                          TALENT_STATE_BADGE[
                            candidate.talentState as TalentState
                          ]
                        }
                      >
                        {
                          TALENT_STATE_LABELS[
                            candidate.talentState as TalentState
                          ]
                        }
                      </Badge>
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setQuickView(candidate)}
                          className="rounded-lg px-2.5 py-1 text-xs font-semibold text-muted transition-colors hover:text-primary"
                        >
                          Ver
                        </button>
                        <Menu
                          align="end"
                          trigger={
                            <IconButton
                              aria-label="Acciones del candidato"
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
                          <MenuLabel>Marcar como</MenuLabel>
                          {TALENT_STATE_ORDER.filter(
                            (s) => s !== candidate.talentState,
                          ).map((s) => (
                            <MenuItem
                              key={s}
                              onClick={() => setState(candidate, s)}
                            >
                              {TALENT_STATE_LABELS[s]}
                            </MenuItem>
                          ))}
                          <MenuSeparator />
                          <MenuItem onClick={() => setQuickView(candidate)}>
                            Ver detalle…
                          </MenuItem>
                        </Menu>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        buildHref={(p) => buildCandidatesHref(filter, query, p)}
      />

      <QuickViewDrawer
        candidate={quickView}
        onClose={() => setQuickView(null)}
      />

      <PostularDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        jobs={jobs}
        candidateIds={[...selected]}
        onDone={(jobTitle, added, skipped) => {
          setDialogOpen(false);
          setSelected(new Set());
          toast({
            message:
              `${added} candidato${added !== 1 ? "s" : ""} a ${jobTitle}` +
              (skipped
                ? ` · ${skipped} ya estaba${skipped !== 1 ? "n" : ""}`
                : ""),
            variant: "success",
          });
        }}
        onError={(message) => toast({ message, variant: "danger" })}
      />
    </div>
  );
}

function QuickViewDrawer({
  candidate,
  onClose,
}: {
  candidate: Candidate | null;
  onClose: () => void;
}) {
  const fullName = candidate
    ? normalizeIfUncapitalized(candidate.fullName)
    : "";
  return (
    <Dialog
      open={candidate !== null}
      onClose={onClose}
      side="right"
      className="max-w-[420px]"
      header={
        candidate ? (
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar name={fullName} size="md" />
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold text-text">
                {fullName}
              </p>
              {candidate.headline && (
                <p className="truncate text-xs text-muted">
                  {candidate.headline}
                </p>
              )}
            </div>
          </div>
        ) : undefined
      }
    >
      {candidate && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Badge
              variant={TALENT_STATE_BADGE[candidate.talentState as TalentState]}
            >
              {TALENT_STATE_LABELS[candidate.talentState as TalentState]}
            </Badge>
            <span className="text-xs text-muted">
              {sourceLabel(candidate.source)}
            </span>
          </div>

          <dl className="flex flex-col gap-2.5 text-sm">
            {candidate.email && (
              <QuickRow label="Email" value={candidate.email} />
            )}
            {candidate.location && (
              <QuickRow
                label="Ubicación"
                value={normalizeIfUncapitalized(candidate.location)}
              />
            )}
            {candidate.linkedinUrl && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-label">
                  LinkedIn
                </dt>
                <dd className="mt-0.5">
                  <a
                    href={candidate.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary-hover"
                  >
                    Ver perfil →
                  </a>
                </dd>
              </div>
            )}
          </dl>

          {candidate.skills && candidate.skills.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-label">
                Skills
              </span>
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-bg px-2 py-0.5 text-xs text-text"
                  >
                    {normalizeIfUncapitalized(s)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {candidate.summary && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-label">
                Resumen
              </span>
              <p className="whitespace-pre-wrap text-sm text-text">
                {candidate.summary}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 border-t border-border pt-4">
            <Link
              href={`/candidates/${candidate.id}`}
              className="text-sm font-semibold text-primary hover:text-primary-hover"
            >
              Ficha completa →
            </Link>
            <Link
              href={`/candidates/${candidate.id}/edit`}
              className="text-sm font-semibold text-muted hover:text-text"
            >
              Editar
            </Link>
            {candidate.cvUrl && (
              <a
                href={`/candidates/${candidate.id}/cv`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-muted hover:text-text"
              >
                Ver CV
              </a>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}

function QuickRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-label">
        {label}
      </dt>
      <dd className="mt-0.5 truncate text-text">{value}</dd>
    </div>
  );
}

function PostularDialog({
  open,
  onClose,
  jobs,
  candidateIds,
  onDone,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  jobs: JobOption[];
  candidateIds: string[];
  onDone: (jobTitle: string, added: number, skipped: number) => void;
  onError: (message: string) => void;
}) {
  const [jobId, setJobId] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) {
      onError("Elegí una búsqueda.");
      return;
    }
    startTransition(async () => {
      const res = await postularVariosAction(jobId, candidateIds);
      if (!res.ok) onError(res.error ?? "No se pudo postular.");
      else onDone(job.title, res.added ?? 0, res.skipped ?? 0);
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      side="center"
      title={`Postular ${candidateIds.length} candidato${candidateIds.length !== 1 ? "s" : ""}`}
      className="max-w-sm"
    >
      <div className="flex flex-col gap-4">
        {jobs.length === 0 ? (
          <p className="text-sm text-muted">
            No tenés búsquedas todavía.{" "}
            <Link
              href="/jobs/new"
              className="font-semibold text-primary hover:underline"
            >
              Creá una primero
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="bulk-job"
              className="text-xs font-semibold text-muted"
            >
              Búsqueda
            </label>
            <select
              id="bulk-job"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="w-full rounded-[var(--radius)] border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]"
            >
              <option value="">Seleccioná una búsqueda…</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-muted hover:text-text"
          >
            Cancelar
          </button>
          <Button
            onClick={submit}
            disabled={isPending || !jobId || jobs.length === 0}
          >
            {isPending ? "Postulando…" : "Postular"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
