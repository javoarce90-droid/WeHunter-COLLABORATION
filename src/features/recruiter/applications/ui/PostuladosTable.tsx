"use client";

import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
  useState,
  useTransition,
} from "react";
import dynamic from "next/dynamic";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { IconButton } from "@/components/ui/icon-button";
import { SearchInput } from "@/components/ui/search-input";
import { FilterChip, FilterChipGroup } from "@/components/ui/filter-chip";
import { Pagination } from "@/components/ui/pagination";
import { AiButton } from "@/components/ui/ai";
import { Tooltip } from "@/components/ui/tooltip";
import { useToast } from "@/lib/toast";
import { withViewTransition } from "@/lib/view-transition";
import { PAGE_SIZE, totalPages as calcTotalPages } from "@/lib/pagination";
import { CANDIDATE_SOURCE_LABELS } from "@/features/recruiter/candidates/ui/source-meta";
import { AgregarCandidatos } from "./AgregarCandidatos";
import type { CompareSubject } from "../../sourcing/ui/CompareCandidatesDialog";
import type { CandidateSource } from "@/features/recruiter/candidates/domain/candidate-details";
import type { CriteriosEvaluados } from "@/features/recruiter/screening/domain/evaluar-criterios";
import {
  STAGE_LABELS,
  REJECTION_REASONS,
  REJECTION_REASON_LABELS,
  DEFAULT_REJECTION_MESSAGE,
  DEFAULT_REJECTION_SUBJECT,
} from "../schema";
import { personalizarMensaje } from "../domain/personalizar-mensaje";
import type { RejectionReason } from "../schema";
import type { PostuladoRow } from "../data/applications.queries";
import type { TimelineNote } from "@/features/recruiter/notes/data/notes.queries";
import {
  rechazarVariosAction,
  analizarPostuladosAction,
  pasarAlPipelineAction,
  guardarEnTalentPoolAction,
  quitarDeTalentPoolAction,
} from "../actions";
import { CriteriosChip } from "./CriteriosChip";
import { MatchCell } from "./MatchCell";
import type { AiAnalysisSubject } from "./AiAnalysisDialog";
import type { ScreeningAnswerLine } from "./PostuladoDetailSheet";

// Diálogos que se abren, como mucho, para UNA fila por vez, y la mayoría de las filas de la
// bandeja nunca los abren — con `next/dynamic` su JS se descarga recién al abrirlos, no en
// el load inicial de Postulados (ver plan de performance, `next/dynamic`).
const SourcingIADialog = dynamic(() =>
  import("./SourcingIADialog").then((m) => m.SourcingIADialog),
);
const CompareCandidatesDialog = dynamic(() =>
  import("../../sourcing/ui/CompareCandidatesDialog").then((m) => m.CompareCandidatesDialog),
);
const AiAnalysisDialog = dynamic(() =>
  import("./AiAnalysisDialog").then((m) => m.AiAnalysisDialog),
);
const PostuladoDetailSheet = dynamic(() =>
  import("./PostuladoDetailSheet").then((m) => m.PostuladoDetailSheet),
);

type PoolCandidate = { id: string; fullName: string; email: string | null };

type Props = {
  jobId: string;
  jobTitle: string;
  postulados: PostuladoRow[];
  criteriosByApplication: Record<string, CriteriosEvaluados>;
  screeningByApplication: Record<string, ScreeningAnswerLine[]>;
  /** Cuántos criterios definió el aviso. 0 = no se muestra la columna. */
  totalCriterios: number;
  notesByApplication: Record<string, TimelineNote[]>;
  /** Candidatos del pool que todavía no están postulados a esta búsqueda — para "Cargar
   *  candidatos" (única entrada a esta acción: ya no vive en Pipeline). */
  poolCandidates: PoolCandidate[];
  /** true si el recruiter conectó Google con el scope de envío — condiciona "Notificar al
   *  candidato" al descartar. */
  canSendEmail: boolean;
  /** true si se llegó acá con `?sourcing=1` (link de la notificación de "Terminó el sourcing
   *  con IA") — abre el panel de Sourcing con IA directo. */
  autoOpenSourcing?: boolean;
};

/** Foco visible estándar para botones de texto/íconos sin fondo (gap WCAG AA de PRODUCT.md). */
const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-surface";

/** ms que tarda la fila triada en desvanecerse antes de salir del set visible. */
const ROW_EXIT_MS = 150;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

type SortKey = "candidate" | "estado" | "date" | "match" | "criterios";
type SortDir = "asc" | "desc";

/** Estado de triage de una postulación: `listPostulados` ya solo trae "pendiente" (la bandeja
 *  filtra en el query — ver applications.queries.ts), pero se sigue calculando acá para la
 *  transición optimista: al clickear "Pasar al pipeline"/"Rechazar" el patch cambia
 *  `pipelineEnteredAt`/`stage` en el cliente antes de que el server revalide, y la fila debe
 *  ocultarse al toque sin esperar el round-trip. Guardar en Talent Pool NO es un estado de la
 *  postulación (ver candidates.saved_to_pool): es una propiedad del candidato. */
type Triage = "pendiente" | "pipeline" | "descartado";
const TRIAGE_ORDER: Record<Triage, number> = {
  pendiente: 0,
  pipeline: 1,
  descartado: 2,
};

function triageDe(row: PostuladoRow): Triage {
  if (row.stage === "rejected") return "descartado";
  return row.pipelineEnteredAt ? "pipeline" : "pendiente";
}

/** Origen de la postulación: auto-postulación vs. alta manual desde el pool. Es un filtro
 *  aparte del triage — ambos ejes son independientes. */
const ORIGIN_FILTERS = ["todos", "auto", "pool"] as const;
type OriginFilter = (typeof ORIGIN_FILTERS)[number];
const ORIGIN_FILTER_LABELS: Record<OriginFilter, string> = {
  todos: "Todos",
  auto: "Auto-postulados",
  pool: "Del pool",
};

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function sourceLabel(source: string | null): string {
  if (!source) return "—";
  return CANDIDATE_SOURCE_LABELS[source as CandidateSource] ?? source;
}

function salaryLabel(amount: number | null, currency: string | null): string {
  if (amount == null) return "—";
  const formatted = new Intl.NumberFormat("es-AR").format(amount);
  return currency ? `${formatted} ${currency}` : formatted;
}

function applicationCountLabel(count: number): string {
  return `${count} búsqueda${count !== 1 ? "s" : ""}`;
}

export function PostuladosTable({
  jobId,
  jobTitle,
  postulados,
  criteriosByApplication,
  screeningByApplication,
  totalCriterios,
  notesByApplication,
  poolCandidates,
  canSendEmail,
  autoOpenSourcing = false,
}: Props) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  // Transición aparte para el análisis IA: es la acción más lenta y su botón muestra loading
  // propio, sin que las mutaciones optimistas (mover, rechazar) queden atrapadas en ese estado.
  const [isAnalyzing, startAnalyze] = useTransition();
  // ids que se están por rechazar en el dialog abierto (null = cerrado).
  const [rejectTarget, setRejectTarget] = useState<Set<string> | null>(null);
  const [poolTarget, setPoolTarget] = useState<string[] | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [aiDetailId, setAiDetailId] = useState<string | null>(null);
  // Selección múltiple — habilita "Comparar" (solo con 2) y "Pasar al pipeline" en lote.
  // Reject y pool ya aceptan varios ids también, pero no están conectados a esto todavía.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [compareIds, setCompareIds] = useState<[string, string] | null>(null);
  const [reason, setReason] = useState<RejectionReason>(REJECTION_REASONS[0]);
  const [note, setNote] = useState("");
  const [poolNote, setPoolNote] = useState("");
  const [notifyCandidate, setNotifyCandidate] = useState(false);
  const [subject, setSubject] = useState(DEFAULT_REJECTION_SUBJECT);
  const [message, setMessage] = useState(DEFAULT_REJECTION_MESSAGE);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "date",
    dir: "desc",
  });

  const [query, setQuery] = useState("");
  const [originFilter, setOriginFilter] = useState<OriginFilter>("todos");
  const [soloCumplen, setSoloCumplen] = useState(false);
  // Paginación en memoria (10 por página): el orden depende de criterios de screening
  // calculados en JS (no viven en SQL), así que no puede ser una query con LIMIT/OFFSET real
  // — se pagina el array ya filtrado/ordenado. Cualquier cambio de filtro/búsqueda/orden
  // vuelve a la página 1, porque el conjunto (o su orden) cambió.
  const [page, setPage] = useState(1);
  // `exiting`: filas triadas con la animación CSS de salida en curso.
  // `hidden`: filas ya sacadas del set visible (post-animación), hasta que el server revalide
  // y `postulados` deje de traerlas. Un rechazo del server las devuelve con `unhide`.
  const [exiting, setExiting] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  // Cuántas postulaciones abarca el análisis de IA en curso (para el aviso "puede tardar").
  const [analyzingCount, setAnalyzingCount] = useState(0);
  // Fila "enfocada" por teclado (j/k). Es un realce visual, no foco del DOM: evita el salto de
  // scroll y el lío de foco al cambiar de página o filtro.
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  function changeQuery(next: string) {
    setQuery(next);
    setPage(1);
  }
  function changeOriginFilter(next: OriginFilter) {
    setOriginFilter(next);
    setPage(1);
  }
  function toggleSoloCumplen() {
    setSoloCumplen((v) => !v);
    setPage(1);
  }
  function changeSortKey(key: SortKey) {
    // Reordenar dentro de una View Transition: las filas se deslizan a su nueva posición en
    // vez de saltar (cada `<tr>` lleva un `view-transition-name` propio).
    withViewTransition(() => {
      setSortKey(key);
      setPage(1);
    });
  }

  /**
   * Saca una o varias filas de la bandeja con animación de salida: primero las desvanece
   * (CSS, `exiting`), y al terminar las quita del set visible (`hidden`) dentro de una View
   * Transition para que el resto de la lista suba sin saltar. Recién ahí corre `commit` (la
   * mutación optimista + server action). Con `prefers-reduced-motion` va directo a `commit`.
   */
  function animateOut(ids: string[], commit: () => void) {
    if (ids.length === 0) return;
    if (prefersReducedMotion()) {
      commit();
      return;
    }
    setExiting((prev) => new Set([...prev, ...ids]));
    window.setTimeout(() => {
      setExiting((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
      withViewTransition(() =>
        setHidden((prev) => new Set([...prev, ...ids])),
      );
      commit();
    }, ROW_EXIT_MS);
  }

  /** Devuelve filas escondidas a la bandeja (rollback cuando el server rechaza la acción). */
  function unhide(ids: string[]) {
    setHidden((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }

  const [rows, applyPatch] = useOptimistic(
    postulados,
    (
      state,
      patch: {
        id: string;
        changes?: Partial<Omit<PostuladoRow, "candidate">>;
        candidateChanges?: Partial<PostuladoRow["candidate"]>;
      },
    ) =>
      state.map((r) =>
        r.id === patch.id
          ? {
              ...r,
              ...patch.changes,
              candidate: { ...r.candidate, ...patch.candidateChanges },
            }
          : r,
      ),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      // Bandeja fija: `listPostulados` ya trae solo pendientes, esto es la ventana de
      // transición optimista mientras se revalida (ver comentario de `Triage` arriba).
      if (triageDe(r) !== "pendiente") return false;
      // Ya animó su salida (triada); se quita al toque, sin esperar el round-trip.
      if (hidden.has(r.id)) return false;
      if (originFilter === "auto" && !r.selfApplied) return false;
      if (originFilter === "pool" && r.selfApplied) return false;
      if (soloCumplen) {
        const c = criteriosByApplication[r.id];
        if (!c || c.total === 0 || c.cumplidos < c.total) return false;
      }
      if (q) {
        const hay =
          `${r.candidate.fullName} ${r.candidate.email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, query, originFilter, soloCumplen, hidden, criteriosByApplication]);

  const sorted = useMemo(() => {
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sort.key === "candidate")
        cmp = a.candidate.fullName.localeCompare(b.candidate.fullName);
      else if (sort.key === "estado")
        cmp = TRIAGE_ORDER[triageDe(a)] - TRIAGE_ORDER[triageDe(b)];
      else if (sort.key === "criterios") {
        const ca = criteriosByApplication[a.id];
        const cb = criteriosByApplication[b.id];
        if (!ca?.total && !cb?.total) cmp = 0;
        else if (!ca?.total) return 1;
        else if (!cb?.total) return -1;
        else cmp = ca.cumplidos / ca.total - cb.cumplidos / cb.total;
      } else if (sort.key === "match") {
        // Sin score va siempre al final, sin importar la dirección.
        if (a.aiScore == null && b.aiScore == null) cmp = 0;
        else if (a.aiScore == null) return 1;
        else if (b.aiScore == null) return -1;
        else cmp = a.aiScore - b.aiScore;
      } else cmp = a.createdAt.getTime() - b.createdAt.getTime();
      return cmp * factor;
    });
  }, [filtered, sort, criteriosByApplication]);

  const totalPagesCount = calcTotalPages(sorted.length, PAGE_SIZE);
  const paged = useMemo(
    () => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sorted, page],
  );

  const allVisibleSelected =
    paged.length > 0 && paged.every((r) => selected.has(r.id));
  const someVisibleSelected = paged.some((r) => selected.has(r.id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) paged.forEach((r) => next.delete(r.id));
      else paged.forEach((r) => next.add(r.id));
      return next;
    });
  }

  function toCompareSubject(row: PostuladoRow): CompareSubject {
    return {
      name: row.candidate.fullName,
      headline: row.candidate.headline ?? "",
      location: row.candidate.location,
      skills: row.candidate.skills ?? [],
      linkedinUrl: row.candidate.linkedinUrl,
      match:
        row.aiScore != null
          ? {
              score: row.aiScore,
              summary: row.aiSummary,
              breakdown: row.aiBreakdown,
              strengths: row.aiStrengths,
              redFlags: row.aiRedFlags,
            }
          : null,
    };
  }
  const compareA = compareIds
    ? (rows.find((r) => r.id === compareIds[0]) ?? null)
    : null;
  const compareB = compareIds
    ? (rows.find((r) => r.id === compareIds[1]) ?? null)
    : null;

  const detailRow = detailId
    ? (rows.find((r) => r.id === detailId) ?? null)
    : null;
  const aiDetailRow = aiDetailId
    ? (rows.find((r) => r.id === aiDetailId) ?? null)
    : null;
  const aiDetailSubject: AiAnalysisSubject | null =
    aiDetailRow && aiDetailRow.aiScore != null
      ? {
          name: aiDetailRow.candidate.fullName,
          headline: aiDetailRow.candidate.headline,
          score: aiDetailRow.aiScore,
          summary: aiDetailRow.aiSummary,
          breakdown: aiDetailRow.aiBreakdown,
          strengths: aiDetailRow.aiStrengths,
          redFlags: aiDetailRow.aiRedFlags,
        }
      : null;

  function setSortKey(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  function onAnalizar() {
    setAnalyzingCount(rows.filter((r) => r.aiScore == null).length);
    startAnalyze(async () => {
      const res = await analizarPostuladosAction(jobId);
      if (!res.ok)
        toast({
          message: res.error ?? "No se pudo analizar.",
          variant: "danger",
        });
      else
        toast({
          message: `${res.scored} postulado${res.scored !== 1 ? "s" : ""} analizado${res.scored !== 1 ? "s" : ""} con IA`,
          variant: "success",
        });
    });
  }

  function onPasarAlPipeline(ids: string[]) {
    if (ids.length === 0) return;
    setDetailId(null);
    setFocusedId(null);
    animateOut(ids, () => {
      startTransition(async () => {
        ids.forEach((id) =>
          applyPatch({ id, changes: { pipelineEnteredAt: new Date() } }),
        );
        const res = await pasarAlPipelineAction({ jobId, applicationIds: ids });
        if (!res.ok) {
          unhide(ids);
          toast({
            message: res.error ?? "No se pudo avanzar.",
            variant: "danger",
          });
          return;
        }
        toast({
          message:
            `${res.hechas} candidato${res.hechas !== 1 ? "s" : ""} al pipeline` +
            (res.saltadas
              ? ` · ${res.saltadas} saltado${res.saltadas !== 1 ? "s" : ""}`
              : ""),
          variant: "success",
        });
      });
    });
  }

  function openRejectDialog(ids: Set<string>) {
    setDetailId(null);
    setRejectTarget(ids);
    setReason(REJECTION_REASONS[0]);
    setNote("");
    setNotifyCandidate(false);
    const soloUnCandidato =
      ids.size === 1
        ? postulados.find((p) => ids.has(p.id))?.candidate.fullName
        : undefined;
    setSubject(
      personalizarMensaje(DEFAULT_REJECTION_SUBJECT, {
        puesto: jobTitle,
        candidato: soloUnCandidato,
      }),
    );
    setMessage(
      personalizarMensaje(DEFAULT_REJECTION_MESSAGE, {
        puesto: jobTitle,
        candidato: soloUnCandidato,
      }),
    );
  }

  function doReject() {
    if (!rejectTarget) return;
    const ids = [...rejectTarget];
    setRejectTarget(null);
    setFocusedId(null);
    animateOut(ids, () => {
      startTransition(async () => {
        ids.forEach((id) => applyPatch({ id, changes: { stage: "rejected" } }));
        const res = await rechazarVariosAction({
          jobId,
          applicationIds: ids,
          reason,
          note: note.trim() || undefined,
          notifyCandidate,
          subject: notifyCandidate ? subject : undefined,
          message: notifyCandidate ? message : undefined,
        });
        if (!res.ok) {
          unhide(ids);
          toast({
            message: res.error ?? "No se pudo rechazar.",
            variant: "danger",
          });
          return;
        }
        toast({
          message:
            `${res.rejected} rechazado${res.rejected !== 1 ? "s" : ""}` +
            (res.skipped
              ? ` · ${res.skipped} saltado${res.skipped !== 1 ? "s" : ""}`
              : "") +
            (notifyCandidate
              ? ` · ${res.notified ?? 0} notificado${res.notified !== 1 ? "s" : ""}`
              : ""),
          variant: "success",
        });
      });
    });
  }

  function openPoolDialog(ids: string[]) {
    setDetailId(null);
    setPoolNote("");
    setPoolTarget(ids);
  }

  function undoGuardarEnPool(ids: string[]) {
    startTransition(async () => {
      ids.forEach((id) =>
        applyPatch({ id, candidateChanges: { savedToPool: false } }),
      );
      const res = await quitarDeTalentPoolAction({ jobId, applicationIds: ids });
      toast(
        res.ok
          ? {
              message: `${res.hechas} candidato${res.hechas !== 1 ? "s" : ""} fuera del pool`,
            }
          : {
              message: res.error ?? "No se pudo deshacer.",
              variant: "danger",
            },
      );
    });
  }

  function doGuardarEnPool() {
    if (!poolTarget) return;
    const ids = poolTarget;
    const note = poolNote.trim();
    setPoolTarget(null);
    startTransition(async () => {
      ids.forEach((id) =>
        applyPatch({ id, candidateChanges: { savedToPool: true } }),
      );
      const res = await guardarEnTalentPoolAction({
        jobId,
        applicationIds: ids,
        note: note || undefined,
      });
      if (!res.ok) {
        toast({
          message: res.error ?? "No se pudo guardar en el pool.",
          variant: "danger",
        });
        return;
      }
      toast({
        message:
          `${res.hechas} candidato${res.hechas !== 1 ? "s" : ""} guardado${res.hechas !== 1 ? "s" : ""} en el Talent Pool` +
          (res.saltadas
            ? ` · ${res.saltadas} saltado${res.saltadas !== 1 ? "s" : ""}`
            : ""),
        variant: "success",
        // Sin nota = probable misclic → ofrecemos deshacer. Con nota, el recruiter invirtió
        // una frase: menos probable que sea un error, y el "Deshacer" no borra la nota.
        action:
          note.length === 0
            ? { label: "Deshacer", onClick: () => undoGuardarEnPool(ids) }
            : undefined,
      });
    });
  }

  const showCriterios = totalCriterios > 0;
  // El bulk analiza toda la bandeja (analizarPostuladosAction(jobId)), no solo lo filtrado/
  // buscado en pantalla — por eso se chequea contra `rows` entero, no `filtered`/`sorted`.
  const hayPendientesDeAnalizar = rows.some((r) => r.aiScore == null);
  const isEmpty = postulados.length === 0;

  const anyOverlayOpen =
    rejectTarget != null ||
    poolTarget != null ||
    detailId != null ||
    aiDetailId != null ||
    compareIds != null;

  // Atajos de teclado tipo bandeja: j/k para moverse, e al pipeline, x descartar, s
  // seleccionar, Enter para abrir, / para buscar. La lógica vive en un ref que un efecto
  // refresca cada render, así el listener del `window` queda estable (un solo add/remove)
  // sin cargar closures viejas.
  const kbdHandler = useRef<(e: KeyboardEvent) => void>(() => {});
  const runKbd = (e: KeyboardEvent) => {
    if (anyOverlayOpen) return;
    const el = e.target as HTMLElement | null;
    const typing =
      !!el &&
      (el.tagName === "INPUT" ||
        el.tagName === "TEXTAREA" ||
        el.tagName === "SELECT" ||
        el.isContentEditable);
    if (e.key === "/" && !typing) {
      e.preventDefault();
      searchRef.current?.focus();
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Escape" && focusedId) {
      setFocusedId(null);
      return;
    }
    if (paged.length === 0) return;
    const idx = focusedId ? paged.findIndex((r) => r.id === focusedId) : -1;
    if (e.key === "j" || e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedId(paged[Math.min(idx + 1, paged.length - 1)]?.id ?? paged[0].id);
    } else if (e.key === "k" || e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedId(paged[Math.max(idx - 1, 0)]?.id ?? paged[0].id);
    } else if (idx >= 0) {
      const row = paged[idx];
      if (e.key === "Enter" || e.key === "o") {
        e.preventDefault();
        setDetailId(row.id);
      } else if (e.key === "e") {
        e.preventDefault();
        onPasarAlPipeline([row.id]);
      } else if (e.key === "x") {
        e.preventDefault();
        openRejectDialog(new Set([row.id]));
      } else if (e.key === "s") {
        e.preventDefault();
        toggleOne(row.id);
      }
    }
  };
  useEffect(() => {
    kbdHandler.current = runKbd;
  });
  useEffect(() => {
    if (isEmpty) return;
    const listener = (e: KeyboardEvent) => kbdHandler.current(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [isEmpty]);

  // Mantener a la vista la fila enfocada por teclado.
  useEffect(() => {
    if (!focusedId) return;
    document
      .getElementById(`postulado-row-${focusedId}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [focusedId]);

  return (
    <div className="flex flex-col gap-6">
      {/* El cluster de acciones vive en una posición ESTABLE del árbol, siempre montado, para
          que su estado (resultados de sourcing en el diálogo) no se pierda cuando el resto de
          la fila (filtros/buscador) aparece o desaparece según haya postulados. Si este bloque
          se moviera a un `return` condicional aparte, React lo desmontaría entero al pasar de 0
          a 1 postulados y se perdería la búsqueda de sourcing en curso. */}
      <div className="flex flex-wrap items-center gap-4">
        {!isEmpty && (
          <FilterChipGroup label="Filtrar postulados por origen">
            {ORIGIN_FILTERS.map((key) => (
              <FilterChip
                key={key}
                active={originFilter === key}
                onClick={() => changeOriginFilter(key)}
              >
                {ORIGIN_FILTER_LABELS[key]}
              </FilterChip>
            ))}
          </FilterChipGroup>
        )}
        {!isEmpty && showCriterios && (
          <FilterChipGroup label="Filtros adicionales">
            <FilterChip active={soloCumplen} onClick={toggleSoloCumplen}>
              Cumplen criterios
            </FilterChip>
          </FilterChipGroup>
        )}

        {/* Los 3 botones van siempre juntos y a la derecha: "Agregar candidatos" y "Sourcing con
            IA" son las dos formas de sumar gente a la bandeja, "Analizar con IA" actúa sobre lo
            que ya está postulado. Mismo tamaño los 3 (Button sm / AiButton comparten padding),
            pero un color distinto cada uno para que no compitan: neutro (Agregar) → ✦ invertido,
            fondo blanco/texto violeta (Sourcing, `AiButton variant="outline"`) → ✦ sólido
            (Analizar, el más prominente — es la acción que más empuja el flujo). */}
        <div
          role="group"
          aria-label="Acciones de postulados"
          className="ml-auto flex items-center gap-3"
        >
          <AgregarCandidatos jobId={jobId} poolCandidates={poolCandidates} />
          <SourcingIADialog jobId={jobId} jobTitle={jobTitle} autoOpenSourcing={autoOpenSourcing} />
          {!isEmpty &&
            (hayPendientesDeAnalizar ? (
              <AiButton
                onClick={onAnalizar}
                loading={isAnalyzing}
                title="Calcular compatibilidad de cada candidato con la búsqueda"
              >
                {isAnalyzing ? "Analizando…" : "Analizar con IA"}
              </AiButton>
            ) : (
              <Tooltip label="Ya se analizaron todas las postulaciones: no hay ninguna pendiente">
                <AiButton disabled>Analizar con IA</AiButton>
              </Tooltip>
            ))}
        </div>
      </div>

      {isAnalyzing && analyzingCount > 0 && (
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-muted"
        >
          <Spinner />
          Analizando {analyzingCount} postulación
          {analyzingCount !== 1 ? "es" : ""} con IA — puede tardar unos segundos.
        </p>
      )}

      {isEmpty ? (
        <EmptyState
          title="Todavía no hay postulaciones"
          description={
            <>
              Cuando alguien se postule al aviso, o sumes un candidato del pool
              o por sourcing con IA, va a aparecer acá para que lo revises y
              decidas si pasa al{" "}
              <span className="font-semibold text-text">Pipeline</span>.
            </>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">
              {sorted.length} de {postulados.length} postulación
              {postulados.length !== 1 ? "es" : ""}
            </p>
            <SearchInput
              value={query}
              onChange={changeQuery}
              inputRef={searchRef}
              placeholder="Buscar por nombre o email…"
              aria-label="Buscar postulados"
            />
            <p className="hidden text-xs text-muted lg:block">
              <Kbd>j</Kbd> <Kbd>k</Kbd> moverte · <Kbd>e</Kbd> al pipeline ·{" "}
              <Kbd>x</Kbd> descartar · <Kbd>s</Kbd> seleccionar · <Kbd>/</Kbd>{" "}
              buscar
            </p>
          </div>

          {selected.size > 0 && (
            <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-primary/30 bg-primary-light px-4 py-3 shadow-[var(--shadow-overlay)] animate-pop-in">
              <span className="text-sm font-semibold text-primary-hover">
                {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
              </span>
              <Button
                size="sm"
                onClick={() => {
                  const ids = [...selected];
                  setSelected(new Set());
                  onPasarAlPipeline(ids);
                }}
              >
                Pasar {selected.size} al pipeline
              </Button>
              {selected.size === 2 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setCompareIds([...selected] as [string, string])
                  }
                >
                  Comparar
                </Button>
              )}
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="text-sm font-semibold text-muted hover:text-text"
              >
                Deseleccionar todo
              </button>
            </div>
          )}

          {sorted.length === 0 ? (
            <EmptyState
              title="Ninguna postulación coincide"
              description="Probá con otro filtro o limpiá la búsqueda."
            />
          ) : (
            <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="w-12 py-3 pl-4 pr-3">
                      <Checkbox
                        checked={allVisibleSelected}
                        aria-label="Seleccionar todos"
                        ref={(el) => {
                          if (el)
                            el.indeterminate =
                              !allVisibleSelected && someVisibleSelected;
                        }}
                        onChange={toggleAll}
                      />
                    </th>
                    <SortableTh
                      label="Candidato"
                      active={sort}
                      sortKey="candidate"
                      onSort={changeSortKey}
                      className="w-[300px]"
                    />
                    <th className="py-3 pr-5 text-xs font-semibold uppercase tracking-wide text-label">
                      Fuente
                    </th>
                    <th className="py-3 pr-5 text-xs font-semibold uppercase tracking-wide text-label">
                      Origen
                    </th>
                    {showCriterios && (
                      <SortableTh
                        label="Criterios"
                        active={sort}
                        sortKey="criterios"
                        onSort={changeSortKey}
                      />
                    )}
                    <SortableTh
                      label="Match"
                      active={sort}
                      sortKey="match"
                      onSort={changeSortKey}
                    />
                    <th className="py-3 pr-5 text-xs font-semibold uppercase tracking-wide text-label">
                      Salario pret.
                    </th>
                    <SortableTh
                      label="Estado"
                      active={sort}
                      sortKey="estado"
                      onSort={changeSortKey}
                    />
                    <th className="py-3 pr-5 text-xs font-semibold uppercase tracking-wide text-label">
                      Postulaciones
                    </th>
                    <SortableTh
                      label="Postulado"
                      active={sort}
                      sortKey="date"
                      onSort={changeSortKey}
                    />
                    <th className="py-3 pr-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paged.map((row, i) => {
                    const triage = triageDe(row);
                    const isExiting = exiting.has(row.id);
                    const isFocused = focusedId === row.id;
                    return (
                      <tr
                        key={row.id}
                        id={`postulado-row-${row.id}`}
                        // Tope en 8: una página con muchas filas no tarda más en asentarse
                        // por tener más — a partir de ahí todas entran con el mismo delay.
                        // `viewTransitionName`: al reordenar o sacar una fila, el navegador
                        // desliza el resto a su nueva posición en vez de saltar.
                        style={
                          {
                            animationDelay: isExiting
                              ? undefined
                              : `${Math.min(i, 8) * 50}ms`,
                            viewTransitionName: `postulado-${row.id}`,
                          } as CSSProperties
                        }
                        className={[
                          "transition-[opacity,transform,background-color] duration-150",
                          isExiting
                            ? "pointer-events-none -translate-x-3 opacity-0 ease-[var(--ease-in-quart)]"
                            : "animate-view-in",
                          isFocused
                            ? "bg-[var(--selected-bg)] ring-2 ring-inset ring-primary"
                            : selected.has(row.id)
                              ? "bg-[var(--selected-bg)]"
                              : "hover:bg-bg",
                        ].join(" ")}
                      >
                        <td className="py-3 pl-4">
                          <Checkbox
                            checked={selected.has(row.id)}
                            onChange={() => toggleOne(row.id)}
                            aria-label={`Seleccionar ${row.candidate.fullName}`}
                          />
                        </td>
                        <td className="max-w-[300px] py-3 pr-5">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar name={row.candidate.fullName} size="sm" />
                            <div className="min-w-0 max-w-[240px]">
                              <button
                                type="button"
                                onClick={() => setDetailId(row.id)}
                                className={`block max-w-full truncate text-left font-semibold text-text transition-colors hover:text-primary ${focusRing}`}
                              >
                                {row.candidate.fullName}
                              </button>
                              <span className="block truncate text-xs text-muted">
                                {row.candidate.headline ??
                                  row.candidate.email ??
                                  "—"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-5 text-muted">
                          {sourceLabel(row.candidate.source)}
                        </td>
                        <td className="py-3 pr-5">
                          <Badge variant={row.selfApplied ? "blue" : "primary"}>
                            {row.selfApplied ? "Auto-postulado" : "Del pool"}
                          </Badge>
                        </td>
                        {showCriterios && (
                          <td className="py-3 pr-5">
                            {criteriosByApplication[row.id] ? (
                              <CriteriosChip
                                criterios={criteriosByApplication[row.id]}
                              />
                            ) : (
                              <span className="text-xs text-muted">—</span>
                            )}
                          </td>
                        )}
                        <td className="py-3 pr-5">
                          <MatchCell
                            score={row.aiScore}
                            summary={row.aiSummary}
                            countUp
                            onOpenCopiloto={
                              row.aiScore != null
                                ? () => setAiDetailId(row.id)
                                : undefined
                            }
                          />
                        </td>
                        <td className="py-3 pr-5 text-muted tabular-nums">
                          {salaryLabel(
                            row.expectedSalary,
                            row.expectedSalaryCurrency,
                          )}
                        </td>
                        <td className="py-3 pr-5">
                          {triage === "descartado" ? (
                            <Badge variant="rejected">Descartado</Badge>
                          ) : triage === "pipeline" ? (
                            <Badge variant={row.stage}>
                              {STAGE_LABELS[row.stage]}
                            </Badge>
                          ) : (
                            <Badge variant="new">Sin revisar</Badge>
                          )}
                        </td>
                        <td className="py-3 pr-5 text-muted tabular-nums">
                          {applicationCountLabel(row.applicationCount)}
                        </td>
                        <td className="py-3 pr-5 text-muted tabular-nums">
                          {dateFmt.format(row.createdAt)}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex justify-end">
                            <Menu
                              align="end"
                              trigger={
                                <IconButton
                                  aria-label="Acciones"
                                  size="sm"
                                  variant="ghost"
                                >
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="currentColor"
                                    aria-hidden
                                  >
                                    <circle cx="8" cy="3" r="1.4" />
                                    <circle cx="8" cy="8" r="1.4" />
                                    <circle cx="8" cy="13" r="1.4" />
                                  </svg>
                                </IconButton>
                              }
                            >
                              <MenuLabel>Postulación</MenuLabel>
                              <MenuItem onClick={() => setDetailId(row.id)}>
                                Ver detalle
                              </MenuItem>
                              {triage === "pendiente" && (
                                <MenuItem
                                  onClick={() => onPasarAlPipeline([row.id])}
                                >
                                  Pasar al pipeline
                                </MenuItem>
                              )}
                              {row.aiScore != null && (
                                <MenuItem onClick={() => setAiDetailId(row.id)}>
                                  Ver análisis IA
                                </MenuItem>
                              )}
                              {triage !== "descartado" && (
                                <>
                                  <MenuSeparator />
                                  {row.candidate.savedToPool ? (
                                    <MenuItem disabled>
                                      Ya es parte de tu pool
                                    </MenuItem>
                                  ) : (
                                    <MenuItem
                                      onClick={() => openPoolDialog([row.id])}
                                    >
                                      Guardar en Talent Pool
                                    </MenuItem>
                                  )}
                                  <MenuItem
                                    destructive
                                    onClick={() =>
                                      openRejectDialog(new Set([row.id]))
                                    }
                                  >
                                    Descartar
                                  </MenuItem>
                                </>
                              )}
                            </Menu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            page={page}
            totalPages={totalPagesCount}
            onPageChange={setPage}
          />
        </div>
      )}

      <PostuladoDetailSheet
        key={detailId ?? "closed"}
        jobId={jobId}
        postulado={detailRow}
        criterios={
          detailRow ? (criteriosByApplication[detailRow.id] ?? null) : null
        }
        screening={
          detailRow ? (screeningByApplication[detailRow.id] ?? []) : []
        }
        notes={detailRow ? (notesByApplication[detailRow.id] ?? []) : []}
        onClose={() => setDetailId(null)}
        onPasarAlPipeline={(r) => onPasarAlPipeline([r.id])}
        onGuardarEnPool={(r) => openPoolDialog([r.id])}
        onDescartar={(r) => openRejectDialog(new Set([r.id]))}
        onOpenCopiloto={(r) => setAiDetailId(r.id)}
      />

      <AiAnalysisDialog
        subject={aiDetailSubject}
        onClose={() => setAiDetailId(null)}
      />

      <CompareCandidatesDialog
        open={compareIds !== null}
        onClose={() => setCompareIds(null)}
        a={compareA ? toCompareSubject(compareA) : null}
        b={compareB ? toCompareSubject(compareB) : null}
      />

      <Dialog
        open={poolTarget != null}
        onClose={() => setPoolTarget(null)}
        side="center"
        title={`¿Guardar ${poolTarget?.length ?? 0} candidato${(poolTarget?.length ?? 0) !== 1 ? "s" : ""} en el Talent Pool?`}
        className="max-w-md"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Salen de esta búsqueda pero quedan marcados como talento disponible
            para futuras. No se les envía ningún mensaje.
          </p>
          <Textarea
            label="Por qué lo guardás (opcional)"
            rows={2}
            value={poolNote}
            onChange={(e) => setPoolNote(e.target.value)}
            placeholder="Solo lo ve el equipo de reclutamiento."
            className="resize-none"
          />
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setPoolTarget(null)}
              className={`rounded text-sm font-semibold text-muted hover:text-text ${focusRing}`}
            >
              Cancelar
            </button>
            <Button variant="primary" onClick={doGuardarEnPool}>
              Guardar en Talent Pool
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={rejectTarget != null}
        onClose={() => setRejectTarget(null)}
        side="center"
        title={`¿Descartar ${rejectTarget?.size ?? 0} postulación${(rejectTarget?.size ?? 0) !== 1 ? "es" : ""}?`}
        className="max-w-md"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Las postulaciones seleccionadas pasarán a{" "}
            <span className="font-semibold text-text">Descartado</span>. Las que
            ya estén descartadas o en una etapa terminal se saltan.
          </p>

          <Select
            label="Motivo de descarte (interno, no lo ve el candidato)"
            value={reason}
            onChange={(e) => setReason(e.target.value as RejectionReason)}
          >
            {REJECTION_REASONS.map((r) => (
              <option key={r} value={r}>
                {REJECTION_REASON_LABELS[r]}
              </option>
            ))}
          </Select>

          <Textarea
            label="Nota interna (opcional)"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Solo la ve el equipo de reclutamiento."
            className="resize-none"
          />

          <label className="flex items-center gap-2 text-sm text-text">
            <Checkbox
              checked={notifyCandidate}
              disabled={!canSendEmail}
              onChange={() => setNotifyCandidate((v) => !v)}
            />
            Notificar al candidato
          </label>
          {!canSendEmail && (
            <p className="text-[11px] text-muted">
              Conectá tu Google en{" "}
              <a href="/settings" className="font-semibold text-primary hover:text-primary-hover">
                Configuración
              </a>{" "}
              para poder enviar el aviso por email.
            </p>
          )}

          {notifyCandidate && (
            <div className="flex flex-col gap-4">
              <Input
                label="Asunto"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
              <div className="flex flex-col gap-2">
                <Textarea
                  label="Mensaje para el candidato"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="resize-y"
                />
                <p className="text-[11px] text-muted">
                  {(rejectTarget?.size ?? 0) > 1 && (
                    <>
                      Cada candidato recibe el mensaje con su propio nombre en
                      lugar de <code>{"{{candidato}}"}</code>.{" "}
                    </>
                  )}
                  No incluye la nota interna.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setRejectTarget(null)}
              className={`rounded text-sm font-semibold text-muted hover:text-text ${focusRing}`}
            >
              Cancelar
            </button>
            <Button
              variant="destructive"
              disabled={
                notifyCandidate &&
                (subject.trim().length === 0 || message.trim().length === 0)
              }
              onClick={doReject}
            >
              Descartar
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

/** Tecla en la ayuda de atajos. `<kbd>` es el uso legítimo de monospace: representa una
 *  pulsación, no decora "lo técnico". */
function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-surface px-2 py-0.5 font-mono text-[10px] font-semibold text-label">
      {children}
    </kbd>
  );
}

function SortableTh({
  label,
  sortKey,
  active,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: SortKey;
  active: { key: SortKey; dir: SortDir };
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = active.key === sortKey;
  return (
    <th
      className={`py-3 pr-5 ${className}`}
      aria-sort={
        isActive ? (active.dir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 rounded text-xs font-semibold uppercase tracking-wide text-label transition-colors hover:text-text ${focusRing}`}
        aria-label={`Ordenar por ${label}`}
      >
        {label}
        <span
          className={isActive ? "text-primary" : "text-transparent"}
          aria-hidden
        >
          {isActive && active.dir === "asc" ? "↑" : "↓"}
        </span>
      </button>
    </th>
  );
}
