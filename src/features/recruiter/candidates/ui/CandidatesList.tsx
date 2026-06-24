"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { Candidate } from "@/db/schema";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/search-input";
import { useToast } from "@/lib/toast";
import { postularVariosAction } from "@/features/recruiter/applications/actions";

type JobOption = { id: string; title: string };

interface Props {
  candidates: Candidate[];
  /** Búsquedas a las que se puede postular en masa desde el listado. */
  jobs: JobOption[];
}

/**
 * Pool de talento como tabla densa (PRODUCT.md "densidad útil": el reclutador escanea).
 * Búsqueda instantánea + selección múltiple con acción masiva (postular a una búsqueda) —
 * accelerators de power-user que antes no existían.
 */
export function CandidatesList({ candidates, jobs }: Props) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);

  if (candidates.length === 0) {
    return (
      <EmptyState
        title="Tu pool está vacío"
        description="Cargá el primer candidato para empezar a armar tus búsquedas."
        action={{ label: "Cargar candidato", href: "/candidates/new" }}
      />
    );
  }

  const q = query.trim().toLowerCase();
  const visible = q
    ? candidates.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q),
      )
    : candidates;

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

  function clearSelection() {
    setSelected(new Set());
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Buscar por nombre o email…"
          aria-label="Buscar candidatos"
        />
        <p className="text-sm text-muted">
          {visible.length} de {candidates.length}
        </p>
      </div>

      {/* Barra de selección: aparece al elegir candidatos. */}
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
            onClick={clearSelection}
            className="text-sm font-semibold text-muted hover:text-text"
          >
            Limpiar
          </button>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border bg-surface px-6 py-12 text-center shadow-[var(--shadow)]">
          <p className="text-sm text-muted">
            Ningún candidato coincide con{" "}
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
        <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="w-10 py-2.5 pl-4">
                  <Checkbox
                    checked={allVisibleSelected}
                    aria-label="Seleccionar todos"
                    ref={(el) => {
                      if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected;
                    }}
                    onChange={toggleAll}
                  />
                </th>
                <th className="py-2.5 pr-3 text-xs font-semibold uppercase tracking-wide text-muted">
                  Candidato
                </th>
                <th className="hidden py-2.5 pr-3 text-xs font-semibold uppercase tracking-wide text-muted sm:table-cell">
                  Email
                </th>
                <th className="py-2.5 pr-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((candidate) => {
                const isSelected = selected.has(candidate.id);
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
                        <Link
                          href={`/candidates/${candidate.id}`}
                          className="truncate font-semibold text-text transition-colors hover:text-primary"
                        >
                          {candidate.fullName}
                        </Link>
                        {candidate.cvUrl && <Badge variant="blue">CV</Badge>}
                      </div>
                    </td>
                    <td className="hidden py-2.5 pr-3 text-muted sm:table-cell">
                      <span className="truncate">{candidate.email || "—"}</span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {candidate.cvUrl && (
                          <a
                            href={`/candidates/${candidate.id}/cv`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted transition-colors hover:border-primary hover:text-primary"
                          >
                            Ver CV
                          </a>
                        )}
                        <Link
                          href={`/candidates/${candidate.id}/edit`}
                          className="rounded-lg px-2.5 py-1 text-xs font-semibold text-muted transition-colors hover:text-primary"
                        >
                          Editar
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <PostularDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        jobs={jobs}
        candidateIds={[...selected]}
        onDone={(jobTitle, added, skipped) => {
          setDialogOpen(false);
          clearSelection();
          toast({
            message:
              `${added} candidato${added !== 1 ? "s" : ""} a ${jobTitle}` +
              (skipped ? ` · ${skipped} ya estaba${skipped !== 1 ? "n" : ""}` : ""),
            variant: "success",
          });
        }}
        onError={(message) => toast({ message, variant: "danger" })}
      />
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
            <Link href="/jobs/new" className="font-semibold text-primary hover:underline">
              Creá una primero
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bulk-job" className="text-xs font-semibold text-muted">
              Búsqueda
            </label>
            <select
              id="bulk-job"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]"
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
          <Button onClick={submit} disabled={isPending || !jobId || jobs.length === 0}>
            {isPending ? "Postulando…" : "Postular"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
