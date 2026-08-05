"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { useToast } from "@/lib/toast";
import { Search } from "lucide-react";
import {
  buscarLinkedinAction,
  importarSourcingAction,
  scorearCandidatoSourcingAction,
} from "../actions";
import { importarSourcingResultadoAction } from "../../applications/actions";
import { AiAnalysisDialog } from "../../applications/ui/AiAnalysisDialog";
import { SourcingCandidateCard } from "./SourcingCandidateCard";
import { SOURCING_MANUAL_SCORE_CAP } from "../domain/sourcear-para-busqueda";
import type { LinkedInCandidateResult } from "../domain/linkedin-search";
import type { ScoredLinkedInCandidate } from "../domain/sourcear-para-busqueda";
import type { SourcingJobOption } from "./SourcingView";

const SUGGESTIONS = [
  "backend engineer supabase python",
  "frontend developer react typescript",
  "fullstack node nextjs tailwind",
  "qa automation engineer cypress",
];

const fieldClass =
  "w-full rounded-[var(--radius)] border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50";

type Decision = "pending" | "out" | "imported";
type ImportedVia = "pool" | "postulado";

type Props = {
  jobs: SourcingJobOption[];
};

export function LinkedInSourcingTab({ jobs }: Props) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<LinkedInCandidateResult[] | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [importedVia, setImportedVia] = useState<Record<string, ImportedVia>>({});
  // Búsqueda elegida por candidato (no por tab) — cada resultado puede postular a una
  // distinta, o a ninguna y quedar solo en el pool.
  const [jobByCandidate, setJobByCandidate] = useState<Record<string, string>>({});
  // Ids en curso de importación — uno solo si es individual, varios si es en lote.
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Score post-hoc por par candidato+búsqueda (ver domain/sourcear-para-busqueda.ts). `scores`
  // guarda los resultados ya calculados; `attemptedPairs` es el gate de "una vez por par" y la
  // base del tope por tanda (SOURCING_MANUAL_SCORE_CAP) — incluye también los que fallaron, no
  // se reintenta un par ya intentado.
  const [scores, setScores] = useState<Record<string, ScoredLinkedInCandidate>>({});
  const [attemptedPairs, setAttemptedPairs] = useState<Set<string>>(new Set());
  const [scoringIds, setScoringIds] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();

  function pairKey(candidateId: string, jobId: string) {
    return `${candidateId}::${jobId}`;
  }

  function buscar(searchQuery?: string) {
    if (candidates !== null) return; // hay que limpiar antes de buscar de nuevo
    const q = searchQuery ?? query;
    if (!q.trim()) return;

    startSearch(async () => {
      const res = await buscarLinkedinAction({ query: q });

      if (!res.ok || !res.candidates) {
        toast({ message: res.error ?? "No se pudo realizar la búsqueda.", variant: "danger" });
        return;
      }
      setCandidates(res.candidates);
      setDecisions({});
      setSelected(new Set());
      setScores({});
      setAttemptedPairs(new Set());
    });
  }

  function limpiar() {
    setCandidates(null);
    setDecisions({});
    setImportedVia({});
    setJobByCandidate({});
    setSelected(new Set());
    setScores({});
    setAttemptedPairs(new Set());
  }

  async function importarUno(c: LinkedInCandidateResult) {
    const jobId = jobByCandidate[c.id] ?? "";
    const res = jobId
      ? await importarSourcingResultadoAction({
          jobId,
          name: c.name,
          headline: c.headline,
          location: c.location,
          skills: c.skills,
          linkedinUrl: c.linkedinUrl,
          summary: c.snippet,
        })
      : await importarSourcingAction({
          name: c.name,
          headline: c.headline,
          location: c.location,
          skills: c.skills,
          linkedinUrl: c.linkedinUrl,
        });
    return { id: c.id, name: c.name, ok: res.ok, error: res.error, via: jobId ? "postulado" as const : "pool" as const };
  }

  function importar(c: LinkedInCandidateResult) {
    setPendingIds((s) => new Set(s).add(c.id));
    startSearch(async () => {
      const res = await importarUno(c);
      setPendingIds((s) => {
        const next = new Set(s);
        next.delete(c.id);
        return next;
      });
      if (!res.ok) {
        toast({ message: res.error ?? "No se pudo importar el candidato.", variant: "danger" });
        return;
      }
      setDecisions((d) => ({ ...d, [c.id]: "imported" }));
      setImportedVia((d) => ({ ...d, [c.id]: res.via }));
      toast({
        message:
          res.via === "postulado"
            ? `${c.name} se sumó al pool y quedó postulado`
            : `${c.name} importado al pool de WeHunter`,
        variant: "success",
      });
    });
  }

  function importarSeleccionados() {
    const targets = (candidates ?? []).filter((c) => selected.has(c.id));
    if (targets.length === 0) return;
    setPendingIds((s) => new Set([...s, ...targets.map((c) => c.id)]));
    startSearch(async () => {
      const outcomes = await Promise.all(targets.map((c) => importarUno(c)));
      const succeeded = outcomes.filter((o) => o.ok);
      const failed = outcomes.filter((o) => !o.ok);

      setPendingIds((s) => {
        const next = new Set(s);
        targets.forEach((c) => next.delete(c.id));
        return next;
      });
      if (succeeded.length > 0) {
        setDecisions((d) => {
          const next = { ...d };
          succeeded.forEach((o) => (next[o.id] = "imported"));
          return next;
        });
        setImportedVia((d) => {
          const next = { ...d };
          succeeded.forEach((o) => (next[o.id] = o.via));
          return next;
        });
      }
      setSelected((s) => {
        const next = new Set(s);
        succeeded.forEach((o) => next.delete(o.id));
        return next;
      });

      if (failed.length === 0) {
        toast({
          message: `${succeeded.length} candidato${succeeded.length === 1 ? "" : "s"} importado${succeeded.length === 1 ? "" : "s"}`,
          variant: "success",
        });
      } else {
        toast({
          message: `${succeeded.length} de ${outcomes.length} importados — ${failed.length} no se pudo${failed.length === 1 ? "" : "n"} importar, quedan en la lista para reintentar`,
          variant: succeeded.length > 0 ? "success" : "danger",
        });
      }
    });
  }

  function omitir(c: LinkedInCandidateResult) {
    setDecisions((d) => ({ ...d, [c.id]: "out" }));
    setSelected((s) => {
      const next = new Set(s);
      next.delete(c.id);
      return next;
    });
  }

  function omitirSeleccionados() {
    setDecisions((d) => {
      const next = { ...d };
      selected.forEach((id) => (next[id] = "out"));
      return next;
    });
    setSelected(new Set());
  }

  function toggleSeleccionado(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onJobChange(c: LinkedInCandidateResult, newJobId: string) {
    setJobByCandidate((m) => ({ ...m, [c.id]: newJobId }));
    if (!newJobId) return; // "solo pool": nada que scorear

    const key = pairKey(c.id, newJobId);
    if (attemptedPairs.has(key)) return; // ya se intentó este par, no se reintenta solo

    if (attemptedPairs.size >= SOURCING_MANUAL_SCORE_CAP) {
      toast({
        message: `Llegaste al límite de ${SOURCING_MANUAL_SCORE_CAP} análisis automáticos para esta tanda — igual podés postular sin el %.`,
      });
      return;
    }

    setAttemptedPairs((s) => new Set(s).add(key));
    setScoringIds((s) => new Set(s).add(c.id));
    scorearCandidatoSourcingAction({
      jobId: newJobId,
      candidate: {
        id: c.id,
        name: c.name,
        headline: c.headline,
        location: c.location,
        skills: c.skills,
        linkedinUrl: c.linkedinUrl,
        snippet: c.snippet,
      },
    }).then((res) => {
      setScoringIds((s) => {
        const next = new Set(s);
        next.delete(c.id);
        return next;
      });
      if (res.ok && res.result) {
        setScores((s) => ({ ...s, [key]: res.result! }));
      }
    });
  }

  const pendingCandidates = (candidates ?? []).filter(
    (c) => (decisions[c.id] ?? "pending") === "pending",
  );
  const allPendingSelected =
    pendingCandidates.length > 0 && pendingCandidates.every((c) => selected.has(c.id));

  const detailCandidate = detailId
    ? (candidates?.find((c) => c.id === detailId) ?? null)
    : null;
  const detailJobId = detailCandidate ? (jobByCandidate[detailCandidate.id] ?? "") : "";
  const detailScored =
    detailCandidate && detailJobId ? scores[pairKey(detailCandidate.id, detailJobId)] : undefined;

  return (
    <div className="flex flex-col gap-5">
      {/* Buscador unificado */}
      <div className="flex flex-col gap-4 rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow)]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            buscar();
          }}
          className="flex flex-col gap-2.5"
        >
          <label htmlFor="linkedin-search-query" className="text-xs font-semibold text-muted">
            Buscar talento en LinkedIn
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <input
                id="linkedin-search-query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ej: Backend Engineer Python Supabase"
                disabled={candidates !== null}
                className={fieldClass}
              />
            </div>
            <Button
              type="submit"
              disabled={searching || !query.trim() || candidates !== null}
              className="shrink-0 gap-2"
            >
              <Search className="h-4 w-4" />
              {searching ? "Buscando…" : "Buscar en LinkedIn"}
            </Button>
          </div>
        </form>

        {/* Búsquedas sugeridas */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs text-muted">Sugerencias:</span>
          {SUGGESTIONS.map((s) => (
            <FilterChip
              key={s}
              active={query === s}
              onClick={() => {
                if (candidates !== null) return;
                setQuery(s);
                buscar(s);
              }}
            >
              {s}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* Resultados de la búsqueda */}
      {candidates === null ? null : candidates.length === 0 ? (
        <div className="flex flex-col items-center gap-4">
          <EmptyState
            title="Sin resultados"
            description="No se encontraron perfiles coincidentes. Probá ajustar los términos de búsqueda."
          />
          <Button variant="secondary" size="sm" onClick={limpiar}>
            Limpiar
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <span className="text-xs font-semibold text-muted">
              {candidates.length} candidato{candidates.length === 1 ? "" : "s"} en LinkedIn
            </span>
            <div className="flex items-center gap-3">
              {pendingCandidates.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelected(
                      allPendingSelected
                        ? new Set()
                        : new Set(pendingCandidates.map((c) => c.id)),
                    )
                  }
                  className="text-xs font-semibold text-primary hover:text-primary-hover"
                >
                  {allPendingSelected ? "Deseleccionar todos" : "Seleccionar todos"}
                </button>
              )}
              <Button variant="secondary" size="sm" onClick={limpiar}>
                Limpiar
              </Button>
            </div>
          </div>

          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-primary/30 bg-primary-light px-4 py-2.5">
              <span className="text-sm font-semibold text-primary-hover">
                {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
              </span>
              <Button
                size="sm"
                onClick={importarSeleccionados}
                loading={pendingIds.size > 0}
                title="Cada candidato usa la búsqueda que elegiste en su propia card, o queda en el pool si no elegiste ninguna"
              >
                Importar {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
              </Button>
              <button
                type="button"
                onClick={omitirSeleccionados}
                className="text-sm font-semibold text-muted hover:text-danger"
              >
                Omitir seleccionados
              </button>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-sm font-semibold text-muted hover:text-text"
              >
                Deseleccionar todo
              </button>
            </div>
          )}

          {candidates.map((c) => {
            const decision = decisions[c.id] ?? "pending";
            if (decision === "out") return null;
            const imported = decision === "imported";
            const jobId = jobByCandidate[c.id] ?? "";
            const scored = jobId ? scores[pairKey(c.id, jobId)] : undefined;

            return (
              <SourcingCandidateCard
                key={c.id}
                name={c.name}
                headline={c.headline}
                location={c.location}
                skills={c.skills}
                linkedinUrl={c.linkedinUrl}
                snippet={c.snippet}
                match={
                  scored
                    ? {
                        score: scored.score,
                        summary: scored.summary,
                        onOpenDetail: () => setDetailId(c.id),
                      }
                    : null
                }
                matchLoading={scoringIds.has(c.id)}
                jobPicker={
                  jobs.length > 0
                    ? {
                        jobs,
                        value: jobId,
                        onChange: (newJobId) => onJobChange(c, newJobId),
                      }
                    : undefined
                }
                selectable={
                  imported
                    ? null
                    : { checked: selected.has(c.id), onToggle: () => toggleSeleccionado(c.id) }
                }
                imported={imported}
                importedLabel={
                  importedVia[c.id] === "postulado"
                    ? "En el pool y postulado ✓"
                    : "En el pool ✓"
                }
                primaryActionLabel={jobId ? "Importar y postular" : "Importar al pool"}
                onPrimaryAction={() => importar(c)}
                primaryActionLoading={pendingIds.has(c.id)}
                primaryActionDisabled={pendingIds.size > 0 && !pendingIds.has(c.id)}
                onOmit={() => omitir(c)}
              />
            );
          })}

          <AiAnalysisDialog
            subject={
              detailScored
                ? {
                    name: detailScored.name,
                    headline: detailScored.headline,
                    score: detailScored.score,
                    summary: detailScored.summary,
                    breakdown: detailScored.breakdown,
                    strengths: detailScored.strengths,
                    redFlags: detailScored.redFlags,
                  }
                : null
            }
            onClose={() => setDetailId(null)}
          />
        </div>
      )}
    </div>
  );
}
