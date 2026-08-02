"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import { useToast } from "@/lib/toast";
import { ExternalLink, Search } from "lucide-react";
import { buscarLinkedinAction, importarSourcingAction } from "../actions";
import type { LinkedInCandidateResult } from "../domain/linkedin-search";

const SUGGESTIONS = [
  "backend engineer supabase python",
  "frontend developer react typescript",
  "fullstack node nextjs tailwind",
  "qa automation engineer cypress",
];

const fieldClass =
  "w-full rounded-[var(--radius)] border border-border bg-bg px-3.5 py-2.5 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]";

type Decision = "pending" | "in" | "out" | "imported";

export function LinkedInSourcingTab() {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [candidates, setCandidates] = useState<LinkedInCandidateResult[] | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [searching, startSearch] = useTransition();

  function buscar(searchQuery?: string) {
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

  function decide(c: LinkedInCandidateResult, decision: Decision) {
    if (decision === "in") {
      startSearch(async () => {
        const res = await importarSourcingAction({
          name: c.name,
          headline: c.headline,
          location: c.location,
          skills: c.skills,
          platform: c.platform,
          linkedinUrl: c.linkedinUrl,
        });
        if (!res.ok) {
          toast({ message: res.error ?? "No se pudo importar el candidato.", variant: "danger" });
          return;
        }
        setDecisions((d) => ({ ...d, [c.id]: "imported" }));
        toast({ message: `${c.name} importado al pool de WeHunter`, variant: "success" });
      });
    } else {
      setDecisions((d) => ({ ...d, [c.id]: decision }));
    }
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
                className={fieldClass}
              />
            </div>
            <Button type="submit" disabled={searching || !query.trim()} className="shrink-0 gap-2">
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
        <EmptyState
          title="Sin resultados"
          description="No se encontraron perfiles coincidentes. Probá ajustar los términos de búsqueda."
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-muted">
              {candidates.length} candidato{candidates.length === 1 ? "" : "s"} en LinkedIn
            </span>
          </div>

          {candidates.map((c) => {
            const decision = decisions[c.id] ?? "pending";
            if (decision === "out") return null;
            const imported = decision === "imported";

            return (
              <div
                key={c.id}
                className="flex flex-col gap-4 rounded-[var(--radius)] border border-border bg-surface p-4 shadow-[var(--shadow)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <Avatar name={c.name} size="md" />
                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-base font-semibold text-text">{c.name}</span>
                      <Badge variant="muted">LinkedIn</Badge>
                    </div>

                    <p className="text-xs font-medium text-text">{c.headline}</p>

                    {c.location && (
                      <p className="text-xs text-muted">{c.location}</p>
                    )}

                    {c.snippet && (
                      <p className="text-xs text-muted line-clamp-2 mt-1 bg-bg/60 p-2.5 rounded-[var(--radius)] border border-border/40 font-normal">
                        {c.snippet}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.skills.map((s) => (
                        <span
                          key={s}
                          className="rounded-md bg-bg px-2 py-0.5 text-[11px] font-medium text-text border border-border/40"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border sm:border-t-0 sm:pt-0 shrink-0">
                  <a
                    href={c.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-border bg-bg px-3 py-1.5 text-xs font-medium text-text hover:bg-surface hover:text-primary transition-colors"
                  >
                    Ver perfil
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>

                  {imported ? (
                    <Badge variant="success">En el pool ✓</Badge>
                  ) : (
                    <>
                      <Button size="sm" onClick={() => decide(c, "in")} disabled={searching}>
                        Importar al pool
                      </Button>
                      <button
                        type="button"
                        onClick={() => decide(c, "out")}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-muted hover:text-danger"
                      >
                        Omitir
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

