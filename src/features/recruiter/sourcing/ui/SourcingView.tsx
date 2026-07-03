"use client";

import { useMemo, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/lib/toast";
import { SENIORITY_LABELS } from "@/features/recruiter/jobs/ui/field-meta";
import {
  buildBooleanQuery,
  SOURCING_PLATFORMS,
  type SourcingResult,
  type SourcingPlatform,
} from "../domain/sourcing";
import { buscarSourcingAction, importarSourcingAction } from "../actions";

const fieldClass =
  "w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]";

type Decision = "pending" | "in" | "out" | "imported";

export function SourcingView() {
  const toast = useToast();
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [seniority, setSeniority] = useState("");
  const [platforms, setPlatforms] = useState<Set<SourcingPlatform>>(new Set(SOURCING_PLATFORMS));
  const [results, setResults] = useState<SourcingResult[] | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [searching, startSearch] = useTransition();

  const kwList = useMemo(
    () => keywords.split(",").map((k) => k.trim()).filter(Boolean),
    [keywords],
  );
  const booleanPreview = useMemo(
    () =>
      buildBooleanQuery({
        keywords: kwList,
        location: location.trim() || null,
        seniority: seniority || null,
        platforms: [...platforms],
      }),
    [kwList, location, seniority, platforms],
  );

  function togglePlatform(p: SourcingPlatform) {
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  function buscar() {
    startSearch(async () => {
      const res = await buscarSourcingAction({
        keywords: kwList,
        location: location.trim() || null,
        seniority: seniority || null,
        platforms: [...platforms],
      });
      if (!res.ok || !res.results) {
        toast({ message: res.error ?? "No se pudo buscar.", variant: "danger" });
        return;
      }
      setResults(res.results);
      setDecisions({});
    });
  }

  function decide(r: SourcingResult, decision: Decision) {
    if (decision === "in") {
      // Adentro = importar al pool.
      startSearch(async () => {
        const res = await importarSourcingAction(r);
        if (!res.ok) {
          toast({ message: res.error ?? "No se pudo importar.", variant: "danger" });
          return;
        }
        setDecisions((d) => ({ ...d, [r.id]: "imported" }));
        toast({ message: `${r.name} importado al pool`, variant: "success" });
      });
    } else {
      setDecisions((d) => ({ ...d, [r.id]: decision }));
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-bold text-text">Sourcing</h1>
        <p className="text-sm text-muted">
          Armá una búsqueda booleana y revisá candidatos de varias plataformas.
        </p>
      </div>

      {/* Honestidad: resultados simulados, sin scraping real. */}
      <p className="rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-xs text-muted">
        Modo demo: los resultados son simulados. La conexión real con LinkedIn/portales se integra
        más adelante; lo que importás sí queda en tu pool.
      </p>

      {/* Builder */}
      <div className="flex flex-col gap-4 rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow)]">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5 sm:col-span-3">
            <label className="text-xs font-semibold text-muted">Keywords / skills (coma)</label>
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="React, Node, PostgreSQL"
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted">Ubicación</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Buenos Aires / Remoto"
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted">Seniority</label>
            <select value={seniority} onChange={(e) => setSeniority(e.target.value)} className={fieldClass}>
              <option value="">Cualquier seniority</option>
              {Object.entries(SENIORITY_LABELS).map(([v, l]) => (
                <option key={v} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-muted">Plataformas</span>
            <div className="flex flex-wrap gap-1.5">
              {SOURCING_PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  aria-pressed={platforms.has(p)}
                  className={[
                    "rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                    platforms.has(p)
                      ? "border-primary bg-primary-light text-primary-hover"
                      : "border-border text-muted hover:text-text",
                  ].join(" ")}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {booleanPreview && (
          <div className="rounded-[var(--radius)] bg-bg px-3 py-2 font-mono text-xs text-text">
            {booleanPreview}
          </div>
        )}

        <div>
          <Button onClick={buscar} disabled={searching || kwList.length === 0}>
            {searching ? "Buscando…" : "Buscar candidatos"}
          </Button>
        </div>
      </div>

      {/* Resultados */}
      {results === null ? null : results.length === 0 ? (
        <EmptyState title="Sin resultados" description="Probá con otros términos o plataformas." />
      ) : (
        <div className="flex flex-col gap-2">
          {results.map((r) => {
            const decision = decisions[r.id] ?? "pending";
            if (decision === "out") return null;
            const imported = decision === "imported";
            return (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-border bg-surface p-3 shadow-[var(--shadow)]"
              >
                <Avatar name={r.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-text">{r.name}</span>
                    <Badge variant="muted">{r.platform}</Badge>
                  </div>
                  <p className="truncate text-xs text-muted">
                    {r.headline} · {r.location}
                  </p>
                </div>
                <div className="hidden max-w-[40%] flex-wrap gap-1 md:flex">
                  {r.skills.slice(0, 4).map((s) => (
                    <span key={s} className="rounded-full bg-bg px-2 py-0.5 text-xs text-text">
                      {s}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  {imported ? (
                    <Badge variant="success">En el pool ✓</Badge>
                  ) : (
                    <>
                      <Button size="sm" onClick={() => decide(r, "in")} disabled={searching}>
                        Adentro
                      </Button>
                      <button
                        type="button"
                        onClick={() => decide(r, "out")}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-muted hover:text-danger"
                      >
                        Fuera
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
