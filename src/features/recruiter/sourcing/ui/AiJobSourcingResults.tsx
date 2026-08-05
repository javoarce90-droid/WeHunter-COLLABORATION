"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AiButton, AiScore } from "@/components/ui/ai";
import { useToast } from "@/lib/toast";
import { ExternalLink } from "lucide-react";
import { sourcearParaBusquedaAction } from "../actions";
import { importarSourcingResultadoAction } from "../../applications/actions";
import type { ScoredLinkedInCandidate } from "../domain/sourcear-para-busqueda";

type Decision = "pending" | "imported" | "omitido";

type Props = {
  jobId: string;
};

/**
 * Sourcing con IA de un clic: busca en LinkedIn con el contexto de la búsqueda (sin que el
 * recruiter escriba nada) y muestra hasta 10 perfiles con su % de match, sin filtrar por score
 * (el recruiter decide mirando el número). La búsqueda no se dispara al montar, solo al click
 * en "Buscar en LinkedIn".
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
          Resultados de demostración: configurá <code>SERPER_API_KEY</code>{" "}
          para buscar perfiles reales en LinkedIn.
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted">
          {results.length} candidato{results.length === 1 ? "" : "s"}{" "}
          encontrado{results.length === 1 ? "" : "s"} en LinkedIn, ordenados
          por match
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
          <div
            key={c.id}
            className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface p-4 shadow-[var(--shadow)]"
          >
            <div className="flex items-start gap-3">
              <Avatar name={c.name} size="md" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold text-text">
                    {c.name}
                  </span>
                  <Badge variant="muted">LinkedIn</Badge>
                </div>
                <p className="text-xs font-medium text-text">{c.headline}</p>
                {c.location && (
                  <p className="text-xs text-muted">{c.location}</p>
                )}
                <div className="mt-1 flex flex-wrap gap-1">
                  {c.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-md border border-border/40 bg-bg px-2 py-1 text-[11px] font-medium text-text"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <AiScore score={c.score} detail={c.summary} />
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
              <a
                href={c.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-xs font-medium text-text transition-colors hover:bg-surface hover:text-primary"
              >
                Ver perfil
                <ExternalLink className="h-3.5 w-3.5" />
              </a>

              {imported ? (
                <Badge variant="success">En el pool y postulado ✓</Badge>
              ) : (
                <>
                  <AiButton
                    onClick={() => agregarYPostular(c)}
                    loading={importingId === c.id}
                    disabled={searching && importingId !== c.id}
                    title="Suma este perfil al pool de candidatos y lo postula a esta búsqueda"
                  >
                    Sumar al pool y postular
                  </AiButton>
                  <button
                    type="button"
                    onClick={() => omitir(c)}
                    className="rounded-lg px-3 py-1 text-xs font-semibold text-muted hover:text-danger"
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
  );
}
