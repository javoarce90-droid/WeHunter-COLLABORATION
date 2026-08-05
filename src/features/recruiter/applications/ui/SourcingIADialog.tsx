"use client";

import { useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { AiButton, AiScore } from "@/components/ui/ai";
import { useToast } from "@/lib/toast";
import { ExternalLink } from "lucide-react";
import { sourcearParaBusquedaAction } from "../../sourcing/actions";
import { importarSourcingResultadoAction } from "../actions";
import type { ScoredLinkedInCandidate } from "../../sourcing/domain/sourcear-para-busqueda";

type Decision = "pending" | "imported" | "omitido";

type Props = {
  jobId: string;
};

/**
 * Sourcing con IA de un clic (ítem 9.4): busca en LinkedIn con el contexto de la búsqueda (sin
 * que el recruiter escriba nada) y solo muestra hasta 10 perfiles con 60% de match o más. La
 * búsqueda no se dispara al abrir el diálogo, solo al click en "Buscar en LinkedIn".
 */
export function SourcingIADialog({ jobId }: Props) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<ScoredLinkedInCandidate[] | null>(
    null,
  );
  const [isLiveApi, setIsLiveApi] = useState(true);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [searching, startSearch] = useTransition();
  const [importingId, setImportingId] = useState<string | null>(null);

  function close() {
    setOpen(false);
  }

  function buscar() {
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

  return (
    <>
      <AiButton type="button" variant="outline" onClick={() => setOpen(true)}>
        Sourcing con IA
      </AiButton>

      <Dialog
        open={open}
        onClose={close}
        side="right"
        title="Sourcing con IA"
        className="w-full max-w-xl"
      >
        {results === null ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <p className="max-w-sm text-sm text-muted">
              Buscamos hasta 10 perfiles en LinkedIn compatibles con esta
              búsqueda (skills, seniority y ubicación) y solo mostramos los que
              matchean 60% o más.
            </p>
            <AiButton onClick={buscar} loading={searching}>
              {searching ? "Buscando…" : "Buscar en LinkedIn"}
            </AiButton>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center gap-4">
            <EmptyState
              title="Ninguno superó el 60% de match"
              description="Probá de nuevo más tarde o sumá candidatos manualmente con Agregar candidatos."
            />
            <AiButton onClick={buscar} loading={searching}>
              {searching ? "Buscando…" : "Buscar de nuevo"}
            </AiButton>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {!isLiveApi && (
              <p className="rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-xs text-muted">
                Resultados de demostración: configurá{" "}
                <code>SERPER_API_KEY</code> para buscar perfiles reales en
                LinkedIn.
              </p>
            )}
            <span className="text-xs font-semibold text-muted">
              {results.length} candidato{results.length === 1 ? "" : "s"} con
              60% de match o más
            </span>

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
                      <p className="text-xs font-medium text-text">
                        {c.headline}
                      </p>
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
        )}
      </Dialog>
    </>
  );
}
