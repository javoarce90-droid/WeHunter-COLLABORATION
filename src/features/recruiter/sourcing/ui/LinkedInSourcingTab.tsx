"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { useToast } from "@/lib/toast";
import { Search } from "lucide-react";
import { buscarLinkedinAction, importarSourcingAction } from "../actions";
import { importarSourcingResultadoAction } from "../../applications/actions";
import { SourcingCandidateCard } from "./SourcingCandidateCard";
import type { LinkedInCandidateResult } from "../domain/linkedin-search";
import type { SourcingJobOption } from "./SourcingView";

const SUGGESTIONS = [
  "backend engineer supabase python",
  "frontend developer react typescript",
  "fullstack node nextjs tailwind",
  "qa automation engineer cypress",
];

const fieldClass =
  "w-full rounded-[var(--radius)] border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50";

type Decision = "pending" | "in" | "out" | "imported";
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
  const [importingId, setImportingId] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();

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
    });
  }

  function limpiar() {
    setCandidates(null);
    setDecisions({});
    setImportedVia({});
    setJobByCandidate({});
  }

  function decide(c: LinkedInCandidateResult, decision: Decision) {
    if (decision !== "in") {
      setDecisions((d) => ({ ...d, [c.id]: decision }));
      return;
    }
    const jobId = jobByCandidate[c.id] ?? "";
    const job = jobs.find((j) => j.id === jobId);
    setImportingId(c.id);
    startSearch(async () => {
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
      setImportingId(null);
      if (!res.ok) {
        toast({ message: res.error ?? "No se pudo importar el candidato.", variant: "danger" });
        return;
      }
      setDecisions((d) => ({ ...d, [c.id]: "imported" }));
      setImportedVia((d) => ({ ...d, [c.id]: jobId ? "postulado" : "pool" }));
      toast({
        message: jobId
          ? `${c.name} se sumó al pool y quedó postulado a ${job?.title ?? "la búsqueda"}`
          : `${c.name} importado al pool de WeHunter`,
        variant: "success",
      });
    });
  }

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
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-muted">
              {candidates.length} candidato{candidates.length === 1 ? "" : "s"} en LinkedIn
            </span>
            <Button variant="secondary" size="sm" onClick={limpiar}>
              Limpiar
            </Button>
          </div>

          {candidates.map((c) => {
            const decision = decisions[c.id] ?? "pending";
            if (decision === "out") return null;
            const imported = decision === "imported";
            const jobId = jobByCandidate[c.id] ?? "";

            return (
              <SourcingCandidateCard
                key={c.id}
                name={c.name}
                headline={c.headline}
                location={c.location}
                skills={c.skills}
                linkedinUrl={c.linkedinUrl}
                snippet={c.snippet}
                jobPicker={
                  jobs.length > 0
                    ? {
                        jobs,
                        value: jobId,
                        onChange: (newJobId) =>
                          setJobByCandidate((m) => ({ ...m, [c.id]: newJobId })),
                      }
                    : undefined
                }
                imported={imported}
                importedLabel={
                  importedVia[c.id] === "postulado"
                    ? "En el pool y postulado ✓"
                    : "En el pool ✓"
                }
                primaryActionLabel={jobId ? "Importar y postular" : "Importar al pool"}
                onPrimaryAction={() => decide(c, "in")}
                primaryActionLoading={importingId === c.id}
                primaryActionDisabled={searching && importingId !== c.id}
                onOmit={() => decide(c, "out")}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
