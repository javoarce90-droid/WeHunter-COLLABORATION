"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AiButton } from "@/components/ui/ai";
import { useToast } from "@/lib/toast";
import {
  sourcearParaBusquedaAction,
  importarSourcingAction,
  getSourcingSessionAction,
  limpiarSourcingSessionAction,
} from "../actions";
import { importarSourcingResultadoAction } from "../../applications/actions";
import { AiAnalysisDialog } from "../../applications/ui/AiAnalysisDialog";
import { CompareCandidatesDialog } from "./CompareCandidatesDialog";
import { SourcingCandidateCard } from "./SourcingCandidateCard";
import { MAX_SEARCH_STEPS } from "../domain/sourcear-para-busqueda";
import type {
  ScoredLinkedInCandidate,
  SourcingMetrics,
} from "../domain/sourcear-para-busqueda";

/** Mensajes que rotan por tiempo transcurrido mientras `searching` sigue `true` — cubre
 *  búsqueda + dedup contra el pool + scoring, que en conjunto pueden tardar bastante (hasta 10
 *  llamadas a IA en paralelo). El último mensaje refuerza algo que YA es cierto (ver
 *  `avisarQueSigueBuscando` más abajo): la búsqueda sigue del lado del servidor aunque el
 *  recruiter navegue a otra subtab, y se lo notifica por la campanita al terminar. */
const PROGRESS_MESSAGES = [
  "Buscando candidatos en LinkedIn…",
  "Comparando con tu pool de talentos — puede demorar un poco…",
  "Podés seguir navegando, te avisamos cuando estén los resultados.",
] as const;

type Decision = "pending" | "imported" | "omitido";

type ImportedVia = "pool" | "postulado";

type Props = {
  jobId: string;
  /** Título de la búsqueda — se usa solo como label de la opción "postular" del selector de
   *  cada card (mismo picker que Sourcing Manual, acá con una única búsqueda fija). */
  jobTitle?: string;
  /** Estado del panel que lo contiene (el `Dialog` de Postulados). No desmonta este componente
   *  al cerrarse — solo lo oculta — así que es la única forma de detectar ese cierre desde acá.
   *  `true` fijo para el caller que no vive en un panel (la tab de /sourcing). */
  open?: boolean;
  /** Avisa al contenedor si hay resultados ya calculados sin revisar (ni sumados ni omitidos):
   *  cerrar en ese estado los pierde de verdad (no se persisten) — el contenedor lo usa para
   *  confirmar antes de dejar cerrar. */
  onUnreviewedResultsChange?: (hasUnreviewed: boolean) => void;
};

/**
 * Sourcing con IA de un clic: busca en LinkedIn con el contexto de la búsqueda (sin que el
 * recruiter escriba nada) y muestra hasta 10 perfiles con su % de match, sin filtrar por score
 * (el recruiter decide mirando el número, y puede abrir el detalle completo del Copiloto IA
 * para ver el desglose). La búsqueda no se dispara al montar, solo al click en "Buscar en
 * LinkedIn". Soporta procesar varios candidatos a la vez (selección múltiple + acciones en
 * lote), no solo de a uno.
 */
export function AiJobSourcingResults({
  jobId,
  jobTitle = "esta búsqueda",
  open = true,
  onUnreviewedResultsChange,
}: Props) {
  const toast = useToast();
  const [results, setResults] = useState<ScoredLinkedInCandidate[] | null>(
    null,
  );
  const [isLiveApi, setIsLiveApi] = useState(true);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [importedVia, setImportedVia] = useState<Record<string, ImportedVia>>({});
  // Por candidato: si además de sumarlo al pool se lo postula a `jobId`. Arranca en `true`
  // (comportamiento previo, único que existía) — el recruiter puede destildarlo por candidato.
  const [postularByCandidate, setPostularByCandidate] = useState<Record<string, boolean>>({});
  // Transición exclusiva de la búsqueda: separada de la de importar (más abajo) para que
  // `searching` signifique sin ambigüedad "hay una búsqueda en curso" — antes compartían una
  // sola transición y hacía falta un flag manual aparte para no rotar el mensaje de "Buscando
  // en LinkedIn…" mientras en realidad se estaba importando un candidato.
  const [searching, startSearch] = useTransition();
  // El pending de esta transición no se usa para UI (cada acción de importar ya se gatea con
  // `pendingIds` por candidato) — solo hace falta `startImport` para que corra por separado de
  // la búsqueda.
  const [, startImport] = useTransition();
  // Ids en curso de importación — uno solo si es individual, varios si es en lote.
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<[string, string] | null>(null);
  // true cuando "Buscar más candidatos" ya recorrió todo el universo de perfiles de esta
  // búsqueda (todas las variantes de query × páginas de Serper). Lo informa el server.
  const [exhausted, setExhausted] = useState(false);
  const [metrics, setMetrics] = useState<SourcingMetrics | null>(null);
  const [progressStage, setProgressStage] = useState<0 | 1 | 2>(0);
  const [hydrating, startHydrate] = useTransition();

  // Restaura la sesión de trabajo en curso al montar (ej. el recruiter navegó afuera mientras
  // buscaba, o volvió por el link de la notificación) — evita perder resultados que ya se
  // calcularon server-side. `cancelled` evita un setState tras desmontar si el recruiter cambia
  // de job antes de que responda.
  useEffect(() => {
    let cancelled = false;
    startHydrate(async () => {
      const res = await getSourcingSessionAction(jobId);
      if (cancelled || !res.ok || !res.session) return;
      setResults(res.session.results);
      setMetrics(res.session.metrics);
      setIsLiveApi(res.session.isLiveApi);
      setExhausted(res.session.attempt >= MAX_SEARCH_STEPS);
    });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  // Rota el mensaje de progreso por tiempo transcurrido mientras dure la búsqueda en curso — no
  // hay forma de saber la fase real del servidor sin partir esto en varios round-trips, y no
  // amerita ese cambio de arquitectura solo para el copy (ver plan). Limpia los timers si
  // `searching` termina antes de tiempo o si el componente se desmonta.
  useEffect(() => {
    if (!searching) return;
    const t1 = setTimeout(() => setProgressStage(1), 2000);
    const t2 = setTimeout(() => setProgressStage(2), 6000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [searching]);

  const hasUnreviewedResults =
    results !== null && results.some((c) => (decisions[c.id] ?? "pending") === "pending");
  useEffect(() => {
    onUnreviewedResultsChange?.(hasUnreviewedResults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnreviewedResults]);

  // La búsqueda sigue en el servidor aunque el usuario se vaya (cierre el panel o navegue a
  // otra subtab): esto avisa de ese caso puntual, una sola vez por búsqueda en curso.
  const searchingRef = useRef(searching);
  useEffect(() => {
    searchingRef.current = searching;
  }, [searching]);
  const notifiedRef = useRef(false);
  const avisarQueSigueBuscando = () => {
    if (notifiedRef.current) return;
    notifiedRef.current = true;
    toast({
      message: "Seguimos buscando en LinkedIn — te avisamos cuando esté listo",
    });
  };

  // Cierre del panel sin navegar: el Dialog oculta pero no desmonta este componente.
  const prevOpenRef = useRef(open);
  useEffect(() => {
    if (prevOpenRef.current && !open && searchingRef.current) {
      avisarQueSigueBuscando();
    }
    prevOpenRef.current = open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Navegación a otra subtab: acá sí se desmonta.
  useEffect(() => {
    return () => {
      if (searchingRef.current) avisarQueSigueBuscando();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // `mode` 0 = búsqueda nueva (reemplaza todo y resetea las decisiones); 1 = "Buscar más
  // candidatos" (el server avanza el cursor de páginas/variantes y devuelve el listado
  // acumulado, ya deduplicado contra el pool y contra lo que este recruiter ya vio).
  function ejecutarBusqueda(mode: 0 | 1) {
    notifiedRef.current = false;
    setProgressStage(0);
    startSearch(async () => {
      const res = await sourcearParaBusquedaAction(jobId, mode);
      if (!res.ok || !res.results || !res.metrics) {
        toast({
          message: res.error ?? "No se pudo buscar en LinkedIn.",
          variant: "danger",
        });
        return;
      }
      setMetrics(res.metrics);
      setIsLiveApi(res.isLiveApi ?? false);
      setExhausted(res.exhausted ?? false);
      setResults(res.results);
      if (mode === 0) {
        setDecisions({});
        setImportedVia({});
        setPostularByCandidate({});
        setSelected(new Set());
        setCompareIds(null);
      }
    });
  }

  function buscar() {
    if (results !== null) return; // primera búsqueda — para pedir otra tanda usar buscarMas()
    ejecutarBusqueda(0);
  }

  function buscarMas() {
    if (results === null) return;
    ejecutarBusqueda(1);
  }

  function limpiar() {
    setResults(null);
    setDecisions({});
    setImportedVia({});
    setPostularByCandidate({});
    setIsLiveApi(true);
    setSelected(new Set());
    setCompareIds(null);
    setExhausted(false);
    setMetrics(null);
    void limpiarSourcingSessionAction(jobId);
  }

  function postularPara(id: string): boolean {
    return postularByCandidate[id] ?? true;
  }

  async function importarUno(c: ScoredLinkedInCandidate) {
    const postular = postularPara(c.id);
    const res = postular
      ? await importarSourcingResultadoAction({
          jobId,
          name: c.name,
          headline: c.headline,
          location: c.location,
          skills: c.skills,
          linkedinUrl: c.linkedinUrl,
          summary: c.summary,
        })
      : await importarSourcingAction({
          name: c.name,
          headline: c.headline,
          location: c.location,
          skills: c.skills,
          linkedinUrl: c.linkedinUrl,
        });
    return {
      id: c.id,
      name: c.name,
      ok: res.ok,
      error: res.error,
      via: postular ? ("postulado" as const) : ("pool" as const),
    };
  }

  function agregarYPostular(c: ScoredLinkedInCandidate) {
    setPendingIds((s) => new Set(s).add(c.id));
    startImport(async () => {
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
      setImportedVia((d) => ({ ...d, [c.id]: res.via }));
      toast({
        message:
          res.via === "postulado"
            ? `${c.name} se sumó al pool y quedó postulado`
            : `${c.name} se sumó al pool`,
        variant: "success",
      });
    });
  }

  function agregarYPostularSeleccionados() {
    const targets = (results ?? []).filter((c) => selected.has(c.id));
    if (targets.length === 0) return;
    setPendingIds((s) => new Set([...s, ...targets.map((c) => c.id)]));
    startImport(async () => {
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
          message: `${succeeded.length} candidato${succeeded.length === 1 ? "" : "s"} sumado${succeeded.length === 1 ? "" : "s"} al pool`,
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

  function toCompareSubject(c: ScoredLinkedInCandidate) {
    return {
      name: c.name,
      headline: c.headline,
      location: c.location,
      skills: c.skills,
      linkedinUrl: c.linkedinUrl,
      match: { score: c.score, summary: c.summary, breakdown: c.breakdown, strengths: c.strengths, redFlags: c.redFlags },
    };
  }
  const compareA = compareIds
    ? (results?.find((c) => c.id === compareIds[0]) ?? null)
    : null;
  const compareB = compareIds
    ? (results?.find((c) => c.id === compareIds[1]) ?? null)
    : null;

  const progressCaption = searching ? (
    <p className="text-xs text-muted" role="status" aria-live="polite">
      {PROGRESS_MESSAGES[progressStage]}
    </p>
  ) : null;

  // Todavía no se sabe si hay una sesión guardada para restaurar — evita el flash de estado
  // vacío y que el recruiter dispare una búsqueda nueva mientras la restauración está en vuelo.
  if (hydrating) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <p className="text-sm text-muted">Restaurando tu última búsqueda…</p>
      </div>
    );
  }

  if (results === null) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <p className="max-w-sm text-sm text-muted">
          Buscamos hasta 10 perfiles en LinkedIn a partir del contexto de
          esta búsqueda (skills, seniority y ubicación) y te mostramos el %
          de match de cada uno, ordenados de mayor a menor.
        </p>
        <div className="flex flex-col items-center gap-2">
          <AiButton onClick={buscar} loading={searching}>
            {searching ? "Buscando…" : "Buscar en LinkedIn"}
          </AiButton>
          {progressCaption}
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    // Serper puede haber encontrado candidatos y que el dedup contra el pool los haya filtrado a
    // todos — es un caso distinto de "la API no devolvió nada", con su propio copy y CTA.
    const todosEnPool = (metrics?.encontrados ?? 0) > 0 && (metrics?.nuevos ?? 0) === 0;
    return (
      <div className="flex flex-col items-center gap-4">
        <EmptyState
          title={todosEnPool ? "Ya tenés a todos en tu pool" : "No encontramos perfiles en LinkedIn"}
          description={
            todosEnPool
              ? exhausted
                ? "Recorrimos todos los resultados de LinkedIn para esta búsqueda y cada perfil ya está en tu pool. Sumá candidatos con Agregar candidatos, o ajustá la búsqueda."
                : "Todos los perfiles de esta tanda ya están en tu pool. Seguí con Buscar más candidatos para traer más resultados de LinkedIn."
              : "Probá de nuevo más tarde o sumá candidatos con Agregar candidatos."
          }
        />
        <div className="flex items-center gap-2">
          {todosEnPool && !exhausted && (
            <div className="flex flex-col items-center gap-2">
              <AiButton variant="outline" onClick={buscarMas} loading={searching}>
                Buscar más candidatos
              </AiButton>
              {progressCaption}
            </div>
          )}
          <Button variant="secondary" size="sm" onClick={limpiar} disabled={searching}>
            Limpiar
          </Button>
        </div>
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
      {metrics && metrics.enPool > 0 && (
        <p className="rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-xs text-muted">
          En esta tanda saltamos {metrics.enPool} perfil
          {metrics.enPool === 1 ? "" : "es"} que ya {metrics.enPool === 1 ? "estaba" : "estaban"} en
          tu pool
          {metrics.nuevos > 0
            ? ` y te mostramos ${metrics.nuevos} nuevo${metrics.nuevos === 1 ? "" : "s"}.`
            : "."}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted">
          {results.length} candidato{results.length === 1 ? "" : "s"}{" "}
          encontrado{results.length === 1 ? "" : "s"} en LinkedIn, ordenados
          por match — tocá el anillo de cada uno para ver el detalle
        </span>
        <div className="flex items-center gap-3">
          {exhausted ? (
            <span className="text-xs text-muted">
              Ya revisamos todos los perfiles de LinkedIn para esta búsqueda
            </span>
          ) : (
            <div className="flex flex-col items-start gap-1">
              <AiButton variant="outline" onClick={buscarMas} loading={searching}>
                Buscar más candidatos
              </AiButton>
              {progressCaption}
            </div>
          )}
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
          <Button variant="secondary" size="sm" onClick={limpiar} disabled={searching}>
            Limpiar
          </Button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-primary/30 bg-primary-light px-4 py-2.5">
          <span className="text-sm font-semibold text-primary-hover">
            {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
          </span>
          {selected.size === 2 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCompareIds([...selected] as [string, string])}
            >
              Comparar
            </Button>
          )}
          <Button
            size="sm"
            onClick={agregarYPostularSeleccionados}
            loading={pendingIds.size > 0}
            title="Cada candidato usa lo que elegiste en su propia card (postular o solo pool)"
          >
            Sumar {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
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
        const postular = postularPara(c.id);

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
            jobPicker={{
              jobs: [{ id: jobId, title: jobTitle }],
              value: postular ? jobId : "",
              onChange: (v) =>
                setPostularByCandidate((s) => ({ ...s, [c.id]: v !== "" })),
            }}
            selectable={
              imported
                ? null
                : { checked: selected.has(c.id), onToggle: () => toggleSeleccionado(c.id) }
            }
            imported={imported}
            importedLabel={
              importedVia[c.id] === "postulado" ? "En el pool y postulado ✓" : "En el pool ✓"
            }
            primaryActionLabel={postular ? "Sumar al pool y postular" : "Sumar al pool"}
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

      <CompareCandidatesDialog
        open={compareIds !== null}
        onClose={() => setCompareIds(null)}
        a={compareA ? toCompareSubject(compareA) : null}
        b={compareB ? toCompareSubject(compareB) : null}
      />
    </div>
  );
}
