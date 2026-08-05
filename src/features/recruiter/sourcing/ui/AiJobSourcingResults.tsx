"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AiButton } from "@/components/ui/ai";
import { useToast } from "@/lib/toast";
import { sourcearParaBusquedaAction } from "../actions";
import { importarSourcingResultadoAction } from "../../applications/actions";
import { AiAnalysisDialog } from "../../applications/ui/AiAnalysisDialog";
import { SourcingCandidateCard } from "./SourcingCandidateCard";
import type { ScoredLinkedInCandidate } from "../domain/sourcear-para-busqueda";

type Decision = "pending" | "imported" | "omitido";

type Props = {
  jobId: string;
};

/**
 * Sourcing con IA de un clic: busca en LinkedIn con el contexto de la búsqueda (sin que el
 * recruiter escriba nada) y muestra hasta 10 perfiles con su % de match, sin filtrar por score
 * (el recruiter decide mirando el número, y puede abrir el detalle completo del Copiloto IA
 * para ver el desglose). La búsqueda no se dispara al montar, solo al click en "Buscar en
 * LinkedIn". Soporta procesar varios candidatos a la vez (selección múltiple + acciones en
 * lote), no solo de a uno.
 */
export function AiJobSourcingResults({ jobId }: Props) {
  const toast = useToast();
  const [results, setResults] = useState<ScoredLinkedInCandidate[] | null>(
    null,
  );
  const [isLiveApi, setIsLiveApi] = useState(true);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [searching, startSearch] = useTransition();
  // Ids en curso de importación — uno solo si es individual, varios si es en lote.
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);

  function buscar() {
    if (results !== null) return; // hay que limpiar antes de buscar de nuevo
    startSearch(async () => {
      const res = await sourcearParaBusquedaAction(jobId);
      if (!res.ok || !res.results) {
        toast({
          message: res.error ?? "No se pudo buscar en LinkedIn.",
          variant: "danger",
        });
        return;
      }
      setResults(res.results);
      setIsLiveApi(res.isLiveApi ?? false);
      setDecisions({});
      setSelected(new Set());
    });
  }

  function limpiar() {
    setResults(null);
    setDecisions({});
    setIsLiveApi(true);
    setSelected(new Set());
  }

  async function importarUno(c: ScoredLinkedInCandidate) {
    const res = await importarSourcingResultadoAction({
      jobId,
      name: c.name,
      headline: c.headline,
      location: c.location,
      skills: c.skills,
      linkedinUrl: c.linkedinUrl,
      summary: c.summary,
    });
    return { id: c.id, name: c.name, ok: res.ok, error: res.error };
  }

  function agregarYPostular(c: ScoredLinkedInCandidate) {
    setPendingIds((s) => new Set(s).add(c.id));
    startSearch(async () => {
      const res = await importarUno(c);
      setPendingIds((s) => {
        const next = new Set(s);
        next.delete(c.id);
        return next;
      });
      if (!res.ok) {
        toast({
          message: res.error ?? "No se pudo agregar al candidato.",
          variant: "danger",
        });
        return;
      }
      setDecisions((d) => ({ ...d, [c.id]: "imported" }));
      toast({
        message: `${c.name} se sumó al pool y quedó postulado`,
        variant: "success",
      });
    });
  }

  function agregarYPostularSeleccionados() {
    const targets = (results ?? []).filter((c) => selected.has(c.id));
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
      }
      setSelected((s) => {
        const next = new Set(s);
        succeeded.forEach((o) => next.delete(o.id));
        return next;
      });

      if (failed.length === 0) {
        toast({
          message: `${succeeded.length} candidato${succeeded.length === 1 ? "" : "s"} sumado${succeeded.length === 1 ? "" : "s"} al pool y postulado${succeeded.length === 1 ? "" : "s"}`,
          variant: "success",
        });
      } else {
        toast({
          message: `${succeeded.length} de ${outcomes.length} importados — ${failed.length} no se pudo${failed.length === 1 ? "" : "n"} agregar, quedan en la lista para reintentar`,
          variant: succeeded.length > 0 ? "success" : "danger",
        });
      }
    });
  }

  function omitir(c: ScoredLinkedInCandidate) {
    setDecisions((d) => ({ ...d, [c.id]: "omitido" }));
    setSelected((s) => {
      const next = new Set(s);
      next.delete(c.id);
      return next;
    });
  }

  function omitirSeleccionados() {
    setDecisions((d) => {
      const next = { ...d };
      selected.forEach((id) => (next[id] = "omitido"));
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

  const detailCandidate = detailId
    ? (results?.find((c) => c.id === detailId) ?? null)
    : null;

  if (results === null) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <p className="max-w-sm text-sm text-muted">
          Buscamos hasta 10 perfiles en LinkedIn a partir del contexto de
          esta búsqueda (skills, seniority y ubicación) y te mostramos el %
          de match de cada uno, ordenados de mayor a menor.
        </p>
        <AiButton onClick={buscar} loading={searching}>
          {searching ? "Buscando…" : "Buscar en LinkedIn"}
        </AiButton>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4">
        <EmptyState
          title="No encontramos perfiles en LinkedIn"
          description="Probá de nuevo más tarde o sumá candidatos manualmente con Agregar candidatos."
        />
        <Button variant="secondary" size="sm" onClick={limpiar}>
          Limpiar
        </Button>
      </div>
    );
  }

  const pendingResults = results.filter((c) => (decisions[c.id] ?? "pending") === "pending");
  const allPendingSelected =
    pendingResults.length > 0 && pendingResults.every((c) => selected.has(c.id));

  return (
    <div className="flex flex-col gap-3">
      {!isLiveApi && (
        <p className="rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-xs text-muted">
          Resultados de demostración — hablá con tu administrador para activar
          la búsqueda en vivo en LinkedIn.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted">
          {results.length} candidato{results.length === 1 ? "" : "s"}{" "}
          encontrado{results.length === 1 ? "" : "s"} en LinkedIn, ordenados
          por match — tocá el anillo de cada uno para ver el detalle
        </span>
        <div className="flex items-center gap-3">
          {pendingResults.length > 1 && (
            <button
              type="button"
              onClick={() =>
                setSelected(
                  allPendingSelected
                    ? new Set()
                    : new Set(pendingResults.map((c) => c.id)),
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
            onClick={agregarYPostularSeleccionados}
            loading={pendingIds.size > 0}
          >
            Sumar {selected.size} al pool y postular
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

      {results.map((c) => {
        const decision = decisions[c.id] ?? "pending";
        if (decision === "omitido") return null;
        const imported = decision === "imported";

        return (
          <SourcingCandidateCard
            key={c.id}
            name={c.name}
            headline={c.headline}
            location={c.location}
            skills={c.skills}
            linkedinUrl={c.linkedinUrl}
            snippet={c.snippet}
            match={{
              score: c.score,
              summary: c.summary,
              onOpenDetail: () => setDetailId(c.id),
            }}
            selectable={
              imported
                ? null
                : { checked: selected.has(c.id), onToggle: () => toggleSeleccionado(c.id) }
            }
            imported={imported}
            importedLabel="En el pool y postulado ✓"
            primaryActionLabel="Sumar al pool y postular"
            onPrimaryAction={() => agregarYPostular(c)}
            primaryActionLoading={pendingIds.has(c.id)}
            primaryActionDisabled={pendingIds.size > 0 && !pendingIds.has(c.id)}
            onOmit={() => omitir(c)}
          />
        );
      })}

      <AiAnalysisDialog
        subject={
          detailCandidate
            ? {
                name: detailCandidate.name,
                headline: detailCandidate.headline,
                score: detailCandidate.score,
                summary: detailCandidate.summary,
                breakdown: detailCandidate.breakdown,
                strengths: detailCandidate.strengths,
                redFlags: detailCandidate.redFlags,
              }
            : null
        }
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}
