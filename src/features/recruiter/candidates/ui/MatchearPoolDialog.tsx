"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AiButton } from "@/components/ui/ai";
import { Select } from "@/components/ui/select";
import { Tooltip } from "@/components/ui/tooltip";
import { MatchCell } from "@/features/recruiter/applications/ui/MatchCell";
import {
  AiAnalysisDialog,
  type AiAnalysisSubject,
} from "@/features/recruiter/applications/ui/AiAnalysisDialog";
import { postularVariosAction } from "@/features/recruiter/applications/actions";
import { useToast } from "@/lib/toast";
import { matchearPoolConBusquedaAction, ignorarCandidatoPoolAction } from "../actions";
import { POOL_MATCH_MAX_CANDIDATES } from "../../sourcing/domain/matchear-pool-interno";
import { CompletenessBadge } from "./completeness-badge";
import type { ScoreBreakdown } from "@/lib/ai/provider";

type JobOption = { id: string; title: string };

type MatchResult = {
  candidateId: string;
  fullName: string;
  headline: string | null;
  completeness: { percent: number; faltantes: string[] };
  score: number;
  summary: string;
  breakdown: ScoreBreakdown;
  strengths: string[];
  redFlags: string[];
  cached: boolean;
};

/**
 * Sourcing interno: elige una búsqueda y matchea con IA hasta `POOL_MATCH_MAX_CANDIDATES`
 * candidatos del pool ya prefiltrados por skills/seniority del puesto. Mismo lenguaje visual
 * que Sourcing con IA (Postulados) — `MatchCell`/`AiAnalysisDialog` reusados tal cual.
 */
export function MatchearPoolDialog({ jobs }: { jobs: JobOption[] }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [poolFiltrado, setPoolFiltrado] = useState(0);
  const [detail, setDetail] = useState<MatchResult | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  const jobTitle = jobs.find((j) => j.id === jobId)?.title ?? "";
  const reusadosCount = results?.filter((r) => r.cached).length ?? 0;

  // Espeja `jobId` para poder leer su valor VIGENTE dentro del closure de `buscar()`, que ya
  // capturó el `jobId` de cuando se lanzó el análisis — lo necesita el guard de más abajo.
  const jobIdRef = useRef(jobId);
  useEffect(() => {
    jobIdRef.current = jobId;
  }, [jobId]);

  function reset() {
    setResults(null);
    setJobId("");
    setAppliedIds(new Set());
  }

  function buscar() {
    if (!jobId) {
      toast({ message: "Elegí una búsqueda.", variant: "danger" });
      return;
    }
    const requestedJobId = jobId;
    startTransition(async () => {
      const res = await matchearPoolConBusquedaAction(requestedJobId);
      // El usuario pudo haber cerrado el panel (reset()) o elegido otra búsqueda mientras esto
      // corría — si `jobId` ya no es el que pidió este análisis, descartar la respuesta en vez
      // de repoblar `results` con datos de una búsqueda que ya no está seleccionada (bug real:
      // el header quedaba "N de N candidatos... para """, con results poblado pero sin título).
      if (jobIdRef.current !== requestedJobId) return;
      if (!res.ok || !res.results) {
        toast({ message: res.error ?? "No se pudo analizar.", variant: "danger" });
        return;
      }
      setResults(res.results);
      setPoolFiltrado(res.poolFiltrado ?? res.results.length);
    });
  }

  function postular(candidateId: string) {
    setApplyingId(candidateId);
    startTransition(async () => {
      const res = await postularVariosAction(jobId, [candidateId]);
      setApplyingId(null);
      if (!res.ok) {
        toast({ message: res.error ?? "No se pudo postular.", variant: "danger" });
        return;
      }
      setAppliedIds((prev) => new Set(prev).add(candidateId));
      toast({ message: "Candidato postulado.", variant: "success" });
    });
  }

  /** Ignora al candidato para ESTA búsqueda: se saca de la lista al toque (optimista) y no
   *  vuelve a aparecer en futuras tandas del match. Recuperable desde el "Deshacer" del toast. */
  function ignorar(row: MatchResult) {
    const forJob = jobId;
    setResults((prev) => prev?.filter((r) => r.candidateId !== row.candidateId) ?? prev);
    startTransition(async () => {
      const res = await ignorarCandidatoPoolAction(forJob, row.candidateId, true);
      if (!res.ok) {
        setResults((prev) => (prev ? [...prev, row].sort((a, b) => b.score - a.score) : prev));
        toast({ message: res.error ?? "No se pudo ignorar.", variant: "danger" });
        return;
      }
      toast({
        message: `${row.fullName} no va a aparecer más en el match de esta búsqueda.`,
        action: {
          label: "Deshacer",
          onClick: () => {
            void ignorarCandidatoPoolAction(forJob, row.candidateId, false);
            setResults((prev) =>
              prev ? [...prev, row].sort((a, b) => b.score - a.score) : prev,
            );
          },
        },
      });
    });
  }

  const subject: AiAnalysisSubject | null = detail
    ? {
        name: detail.fullName,
        headline: detail.headline,
        score: detail.score,
        summary: detail.summary,
        breakdown: detail.breakdown,
        strengths: detail.strengths,
        redFlags: detail.redFlags,
      }
    : null;

  return (
    <>
      <AiButton type="button" variant="outline" onClick={() => setOpen(true)}>
        Matchear con IA
      </AiButton>

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        side="right"
        title="Matchear pool con IA"
        className="w-full max-w-xl"
      >
        <div className="flex flex-col gap-4">
          {!results ? (
            <>
              <p className="text-sm text-muted">
                Elegí una búsqueda: analizamos con IA hasta {POOL_MATCH_MAX_CANDIDATES}{" "}
                candidatos del pool que matcheen sus skills o seniority.
              </p>
              <Select
                label="Búsqueda"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
              >
                <option value="">Seleccioná una búsqueda…</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </Select>
              <div className="flex justify-end">
                <AiButton onClick={buscar} loading={isPending} disabled={!jobId || isPending}>
                  Analizar
                </AiButton>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted">
                  {results.length} de {poolFiltrado} candidato
                  {poolFiltrado !== 1 ? "s" : ""} del pool analizados para “{jobTitle}”
                  {reusadosCount > 0 && ` · ${reusadosCount} reusado${reusadosCount !== 1 ? "s" : ""} del último análisis`}
                </p>
                <button
                  type="button"
                  onClick={reset}
                  className="shrink-0 text-xs font-semibold text-primary hover:underline"
                >
                  Nueva búsqueda
                </button>
              </div>

              {results.length === 0 ? (
                <p className="text-sm text-muted">
                  No hay candidatos en tu pool que matcheen los skills o el seniority de esta
                  búsqueda.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {results.map((r, i) => (
                    <li
                      key={r.candidateId}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-surface p-3"
                    >
                      {/* Los resultados ya vienen ordenados por score — cuando varios empatan
                          en la misma banda (mismo color de anillo, mismo badge), esta posición
                          es la única pista de por dónde arrancar a mirar. */}
                      <span
                        className="grid h-6 w-6 shrink-0 place-items-center text-xs font-semibold tabular-nums text-muted"
                        aria-hidden
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-text">{r.fullName}</p>
                        {r.headline && (
                          <p className="truncate text-xs text-muted">{r.headline}</p>
                        )}
                        <div className="mt-1 flex items-center gap-2">
                          <CompletenessBadge
                            percent={r.completeness.percent}
                            faltantes={r.completeness.faltantes}
                          />
                          {r.cached && (
                            <Tooltip label="Reusado del último análisis para esta búsqueda — no se volvió a llamar a la IA.">
                              <Badge variant="muted">Reusado</Badge>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                      <MatchCell
                        score={r.score}
                        summary={r.summary}
                        onOpenCopiloto={() => setDetail(r)}
                      />
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => ignorar(r)}
                          className="text-xs font-semibold text-muted hover:text-text"
                        >
                          Ignorar
                        </button>
                        <Link
                          href={`/candidates/${r.candidateId}`}
                          className="text-xs font-semibold text-muted hover:text-text"
                        >
                          Ver ficha
                        </Link>
                        <Button
                          size="sm"
                          onClick={() => postular(r.candidateId)}
                          disabled={appliedIds.has(r.candidateId) || applyingId === r.candidateId}
                        >
                          {appliedIds.has(r.candidateId)
                            ? "Postulado"
                            : applyingId === r.candidateId
                              ? "Postulando…"
                              : "Postular"}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </Dialog>

      <AiAnalysisDialog subject={subject} onClose={() => setDetail(null)} />
    </>
  );
}
