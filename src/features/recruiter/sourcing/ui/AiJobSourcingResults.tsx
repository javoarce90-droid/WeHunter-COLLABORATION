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
 * LinkedIn".
 */
export function AiJobSourcingResults({ jobId }: Props) {
  const toast = useToast();
  const [results, setResults] = useState<ScoredLinkedInCandidate[] | null>(
    null,
  );
  const [isLiveApi, setIsLiveApi] = useState(true);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [searching, startSearch] = useTransition();
  const [importingId, setImportingId] = useState<string | null>(null);
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
    });
  }

  function limpiar() {
    setResults(null);
    setDecisions({});
    setIsLiveApi(true);
  }

  function agregarYPostular(c: ScoredLinkedInCandidate) {
    setImportingId(c.id);
    startSearch(async () => {
      const res = await importarSourcingResultadoAction({
        jobId,
        name: c.name,
        headline: c.headline,
        location: c.location,
        skills: c.skills,
        linkedinUrl: c.linkedinUrl,
        summary: c.summary,
      });
      setImportingId(null);
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

  function omitir(c: ScoredLinkedInCandidate) {
    setDecisions((d) => ({ ...d, [c.id]: "omitido" }));
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

  return (
    <div className="flex flex-col gap-3">
      {!isLiveApi && (
        <p className="rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-xs text-muted">
          Resultados de demostración — hablá con tu administrador para activar
          la búsqueda en vivo en LinkedIn.
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted">
          {results.length} candidato{results.length === 1 ? "" : "s"}{" "}
          encontrado{results.length === 1 ? "" : "s"} en LinkedIn, ordenados
          por match — tocá el anillo de cada uno para ver el detalle
        </span>
        <Button variant="secondary" size="sm" onClick={limpiar}>
          Limpiar
        </Button>
      </div>

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
            imported={imported}
            importedLabel="En el pool y postulado ✓"
            primaryActionLabel="Sumar al pool y postular"
            onPrimaryAction={() => agregarYPostular(c)}
            primaryActionLoading={importingId === c.id}
            primaryActionDisabled={searching && importingId !== c.id}
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
