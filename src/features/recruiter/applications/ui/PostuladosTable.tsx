"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { IconButton } from "@/components/ui/icon-button";
import { SearchInput } from "@/components/ui/search-input";
import { FilterChip, FilterChipGroup } from "@/components/ui/filter-chip";
import { AiScore, AiButton } from "@/components/ui/ai";
import { useToast } from "@/lib/toast";
import { CANDIDATE_SOURCE_LABELS } from "@/features/recruiter/candidates/ui/source-meta";
import type { CandidateSource } from "@/features/recruiter/candidates/domain/candidate-details";
import type { CriteriosEvaluados } from "@/features/recruiter/screening/domain/evaluar-criterios";
import {
  STAGE_LABELS,
  REJECTION_REASONS,
  REJECTION_REASON_LABELS,
  DEFAULT_REJECTION_MESSAGE,
} from "../schema";
import type { RejectionReason } from "../schema";
import type { PostuladoRow } from "../data/applications.queries";
import {
  marcarFavoritoAction,
  rechazarVariosAction,
  analizarPostuladosAction,
  pasarAlPipelineAction,
  guardarEnTalentPoolAction,
} from "../actions";
import { CriteriosChip } from "./CriteriosChip";
import { ContactarDialog } from "./ContactarDialog";
import { PostuladoDetailSheet, type ScreeningAnswerLine } from "./PostuladoDetailSheet";

type Props = {
  jobId: string;
  jobTitle: string;
  postulados: PostuladoRow[];
  criteriosByApplication: Record<string, CriteriosEvaluados>;
  screeningByApplication: Record<string, ScreeningAnswerLine[]>;
  /** Cuántos criterios definió el aviso. 0 = no se muestra la columna. */
  totalCriterios: number;
};

/** Foco visible estándar para botones de texto/íconos sin fondo (gap WCAG AA de PRODUCT.md). */
const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-surface";

type SortKey = "candidate" | "estado" | "date" | "match" | "criterios";
type SortDir = "asc" | "desc";

/** Estado de triage de una postulación: es el eje sobre el que trabaja esta pantalla. */
type Triage = "pendiente" | "pipeline" | "descartado";
const TRIAGE_FILTERS = ["pendiente", "pipeline", "descartado", "todos"] as const;
type TriageFilter = (typeof TRIAGE_FILTERS)[number];
const TRIAGE_FILTER_LABELS: Record<TriageFilter, string> = {
  pendiente: "Sin revisar",
  pipeline: "En pipeline",
  descartado: "Descartados",
  todos: "Todos",
};
const TRIAGE_ORDER: Record<Triage, number> = { pendiente: 0, pipeline: 1, descartado: 2 };

function triageDe(row: PostuladoRow): Triage {
  if (row.stage === "rejected") return "descartado";
  return row.pipelineEnteredAt ? "pipeline" : "pendiente";
}

const dateFmt = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric" });

function sourceLabel(source: string | null): string {
  if (!source) return "—";
  return CANDIDATE_SOURCE_LABELS[source as CandidateSource] ?? source;
}

export function PostuladosTable({
  jobId,
  jobTitle,
  postulados,
  criteriosByApplication,
  screeningByApplication,
  totalCriterios,
}: Props) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  // Transición aparte para el análisis IA: es la acción más lenta y su botón muestra loading
  // propio, sin que las mutaciones optimistas (favorito/mover) queden atrapadas en ese estado.
  const [isAnalyzing, startAnalyze] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // ids que se están por rechazar en el dialog abierto (null = cerrado). Individual y en
  // lote comparten el mismo dialog; no reusa `selected` porque el individual (vía menú de
  // fila) no debe tocar la selección de checkboxes.
  const [rejectTarget, setRejectTarget] = useState<Set<string> | null>(null);
  const [poolTarget, setPoolTarget] = useState<string[] | null>(null);
  const [contactTarget, setContactTarget] = useState<string[] | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reason, setReason] = useState<RejectionReason>(REJECTION_REASONS[0]);
  const [note, setNote] = useState("");
  const [poolNote, setPoolNote] = useState("");
  const [notifyCandidate, setNotifyCandidate] = useState(false);
  const [message, setMessage] = useState(DEFAULT_REJECTION_MESSAGE);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "date", dir: "desc" });

  const [query, setQuery] = useState("");
  const [triageFilter, setTriageFilter] = useState<TriageFilter>("pendiente");
  const [soloCumplen, setSoloCumplen] = useState(false);
  const [soloFavoritos, setSoloFavoritos] = useState(false);

  const [rows, applyPatch] = useOptimistic(
    postulados,
    (state, patch: { id: string; changes: Partial<PostuladoRow> }) =>
      state.map((r) => (r.id === patch.id ? { ...r, ...patch.changes } : r)),
  );

  const counts = useMemo(() => {
    const c = { pendiente: 0, pipeline: 0, descartado: 0, todos: rows.length };
    for (const r of rows) c[triageDe(r)] += 1;
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (triageFilter !== "todos" && triageDe(r) !== triageFilter) return false;
      if (soloFavoritos && !r.isFavorite) return false;
      if (soloCumplen) {
        const c = criteriosByApplication[r.id];
        if (!c || c.total === 0 || c.cumplidos < c.total) return false;
      }
      if (q) {
        const hay = `${r.candidate.fullName} ${r.candidate.email ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, query, triageFilter, soloCumplen, soloFavoritos, criteriosByApplication]);

  const sorted = useMemo(() => {
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sort.key === "candidate") cmp = a.candidate.fullName.localeCompare(b.candidate.fullName);
      else if (sort.key === "estado") cmp = TRIAGE_ORDER[triageDe(a)] - TRIAGE_ORDER[triageDe(b)];
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

  if (postulados.length === 0) {
    return (
      <EmptyState
        title="Todavía no hay postulaciones"
        description={
          <>
            Cuando alguien se postule al aviso va a aparecer acá para que lo revises y decidas
            si pasa al <span className="font-semibold text-text">Pipeline</span>. También podés
            sumar candidatos del pool directo al pipeline.
          </>
        }
      />
    );
  }

  const allSelected = sorted.length > 0 && sorted.every((r) => selected.has(r.id));
  const someSelected = sorted.some((r) => selected.has(r.id));
  const detailRow = detailId ? (rows.find((r) => r.id === detailId) ?? null) : null;

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
      if (allSelected) sorted.forEach((r) => next.delete(r.id));
      else sorted.forEach((r) => next.add(r.id));
      return next;
    });
  }

  function setSortKey(key: SortKey) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  }

  function onToggleFavorite(row: PostuladoRow) {
    const next = !row.isFavorite;
    startTransition(async () => {
      applyPatch({ id: row.id, changes: { isFavorite: next } });
      const res = await marcarFavoritoAction(row.id, next, jobId);
      if (!res.ok) toast({ message: res.error ?? "No se pudo marcar.", variant: "danger" });
    });
  }

  function onAnalizar() {
    startAnalyze(async () => {
      const res = await analizarPostuladosAction(jobId);
      if (!res.ok) toast({ message: res.error ?? "No se pudo analizar.", variant: "danger" });
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
    startTransition(async () => {
      ids.forEach((id) => applyPatch({ id, changes: { pipelineEnteredAt: new Date() } }));
      const res = await pasarAlPipelineAction({ jobId, applicationIds: ids });
      setSelected(new Set());
      if (!res.ok) {
        toast({ message: res.error ?? "No se pudo avanzar.", variant: "danger" });
        return;
      }
      toast({
        message:
          `${res.hechas} candidato${res.hechas !== 1 ? "s" : ""} al pipeline` +
          (res.saltadas ? ` · ${res.saltadas} saltado${res.saltadas !== 1 ? "s" : ""}` : ""),
        variant: "success",
      });
    });
  }

  function openRejectDialog(ids: Set<string>) {
    setDetailId(null);
    setRejectTarget(ids);
    setReason(REJECTION_REASONS[0]);
    setNote("");
    setNotifyCandidate(false);
    setMessage(DEFAULT_REJECTION_MESSAGE);
  }

  function doReject() {
    if (!rejectTarget) return;
    const ids = [...rejectTarget];
    setRejectTarget(null);
    startTransition(async () => {
      ids.forEach((id) => applyPatch({ id, changes: { stage: "rejected" } }));
      const res = await rechazarVariosAction({
        jobId,
        applicationIds: ids,
        reason,
        note: note.trim() || undefined,
        notifyCandidate,
        message: notifyCandidate ? message : undefined,
      });
      setSelected(new Set());
      if (!res.ok) toast({ message: res.error ?? "No se pudo rechazar.", variant: "danger" });
      else
        toast({
          message:
            `${res.rejected} rechazado${res.rejected !== 1 ? "s" : ""}` +
            (res.skipped ? ` · ${res.skipped} saltado${res.skipped !== 1 ? "s" : ""}` : "") +
            (notifyCandidate ? ` · ${res.notified ?? 0} notificado${res.notified !== 1 ? "s" : ""}` : ""),
          variant: "success",
        });
    });
  }

  function openPoolDialog(ids: string[]) {
    setDetailId(null);
    setPoolNote("");
    setPoolTarget(ids);
  }

  function doGuardarEnPool() {
    if (!poolTarget) return;
    const ids = poolTarget;
    setPoolTarget(null);
    startTransition(async () => {
      ids.forEach((id) => applyPatch({ id, changes: { stage: "rejected" } }));
      const res = await guardarEnTalentPoolAction({
        jobId,
        applicationIds: ids,
        note: poolNote.trim() || undefined,
      });
      setSelected(new Set());
      if (!res.ok) {
        toast({ message: res.error ?? "No se pudo guardar en el pool.", variant: "danger" });
        return;
      }
      toast({
        message:
          `${res.hechas} candidato${res.hechas !== 1 ? "s" : ""} guardado${res.hechas !== 1 ? "s" : ""} en el Talent Pool` +
          (res.saltadas ? ` · ${res.saltadas} saltado${res.saltadas !== 1 ? "s" : ""}` : ""),
        variant: "success",
      });
    });
  }

  const showCriterios = totalCriterios > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Buscar por nombre o email…"
            aria-label="Buscar postulados"
          />
          <FilterChipGroup label="Filtrar postulados por estado">
            {TRIAGE_FILTERS.map((key) => (
              <FilterChip
                key={key}
                active={triageFilter === key}
                count={counts[key]}
                onClick={() => setTriageFilter(key)}
              >
                {TRIAGE_FILTER_LABELS[key]}
              </FilterChip>
            ))}
          </FilterChipGroup>
        </div>
        <AiButton
          onClick={onAnalizar}
          loading={isAnalyzing}
          title="Calcular compatibilidad de cada candidato con la búsqueda"
        >
          {isAnalyzing ? "Analizando…" : "Analizar con IA"}
        </AiButton>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterChipGroup label="Filtros adicionales">
          {showCriterios && (
            <FilterChip active={soloCumplen} onClick={() => setSoloCumplen((v) => !v)}>
              Cumplen todos los criterios
            </FilterChip>
          )}
          <FilterChip active={soloFavoritos} onClick={() => setSoloFavoritos((v) => !v)}>
            Favoritos
          </FilterChip>
        </FilterChipGroup>
        <p className="text-sm text-muted">
          {sorted.length} de {postulados.length} postulación
          {postulados.length !== 1 ? "es" : ""}
        </p>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-primary/30 bg-primary-light px-4 py-2.5">
          <span className="mr-1 text-sm font-semibold text-primary-hover">
            {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
          </span>
          <Button size="sm" variant="primary" onClick={() => onPasarAlPipeline([...selected])}>
            Pasar al pipeline
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setContactTarget([...selected])}>
            Contactar
          </Button>
          <Button size="sm" variant="secondary" onClick={() => openPoolDialog([...selected])}>
            Guardar en Talent Pool
          </Button>
          <Button size="sm" variant="destructive" onClick={() => openRejectDialog(selected)}>
            Descartar
          </Button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className={`rounded text-sm font-semibold text-muted hover:text-text ${focusRing}`}
          >
            Limpiar
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
                <th className="w-10 py-2.5 pl-4">
                  <Checkbox
                    checked={allSelected}
                    aria-label="Seleccionar todos"
                    ref={(el) => {
                      if (el) el.indeterminate = !allSelected && someSelected;
                    }}
                    onChange={toggleAll}
                  />
                </th>
                <SortableTh label="Candidato" active={sort} sortKey="candidate" onSort={setSortKey} />
                <th className="hidden py-2.5 pr-3 text-xs font-semibold uppercase tracking-wide text-label md:table-cell">
                  Fuente
                </th>
                {showCriterios && (
                  <SortableTh label="Criterios" active={sort} sortKey="criterios" onSort={setSortKey} />
                )}
                <SortableTh label="Match" active={sort} sortKey="match" onSort={setSortKey} />
                <SortableTh label="Estado" active={sort} sortKey="estado" onSort={setSortKey} />
                <SortableTh
                  label="Postulado"
                  active={sort}
                  sortKey="date"
                  onSort={setSortKey}
                  className="hidden sm:table-cell"
                />
                <th className="py-2.5 pr-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((row) => {
                const isSelected = selected.has(row.id);
                const triage = triageDe(row);
                return (
                  <tr
                    key={row.id}
                    className={[
                      "transition-colors",
                      isSelected ? "bg-[var(--selected-bg)]" : "hover:bg-bg",
                    ].join(" ")}
                  >
                    <td className="py-2.5 pl-4">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleOne(row.id)}
                        aria-label={`Seleccionar ${row.candidate.fullName}`}
                      />
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => onToggleFavorite(row)}
                          aria-label={row.isFavorite ? "Quitar de favoritos" : "Marcar favorito"}
                          aria-pressed={row.isFavorite}
                          className={`shrink-0 rounded text-muted transition-colors hover:text-warning ${focusRing}`}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill={row.isFavorite ? "#EA580C" : "none"}
                            stroke={row.isFavorite ? "#EA580C" : "currentColor"}
                            strokeWidth="2"
                            strokeLinejoin="round"
                            aria-hidden
                          >
                            <path d="M12 2l2.9 6.3 6.8.7-5 4.6 1.4 6.7L12 17.8 5.9 20.9 7.3 14.2l-5-4.6 6.8-.7z" />
                          </svg>
                        </button>
                        <Avatar name={row.candidate.fullName} size="sm" />
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setDetailId(row.id)}
                            className={`block max-w-full truncate text-left font-semibold text-text transition-colors hover:text-primary ${focusRing}`}
                          >
                            {row.candidate.fullName}
                          </button>
                          {row.candidate.email && (
                            <span className="block truncate text-xs text-muted">
                              {row.candidate.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="hidden py-2.5 pr-3 text-muted md:table-cell">
                      {sourceLabel(row.candidate.source)}
                    </td>
                    {showCriterios && (
                      <td className="py-2.5 pr-3">
                        {criteriosByApplication[row.id] ? (
                          <CriteriosChip criterios={criteriosByApplication[row.id]} />
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>
                    )}
                    <td className="py-2.5 pr-3">
                      {row.aiScore != null ? (
                        <AiScore score={row.aiScore} size={28} detail={row.aiSummary} />
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      {triage === "descartado" ? (
                        <Badge variant="rejected">Descartado</Badge>
                      ) : triage === "pipeline" ? (
                        <Badge variant={row.stage}>{STAGE_LABELS[row.stage]}</Badge>
                      ) : (
                        <Badge variant="new">Sin revisar</Badge>
                      )}
                    </td>
                    <td className="hidden py-2.5 pr-3 text-muted tabular-nums sm:table-cell">
                      {dateFmt.format(row.createdAt)}
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex justify-end">
                        <Menu
                          align="end"
                          trigger={
                            <IconButton aria-label="Acciones" size="sm" variant="ghost">
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                                <circle cx="8" cy="3" r="1.4" />
                                <circle cx="8" cy="8" r="1.4" />
                                <circle cx="8" cy="13" r="1.4" />
                              </svg>
                            </IconButton>
                          }
                        >
                          <MenuLabel>Postulación</MenuLabel>
                          <MenuItem onClick={() => setDetailId(row.id)}>Ver detalle</MenuItem>
                          {triage === "pendiente" && (
                            <MenuItem onClick={() => onPasarAlPipeline([row.id])}>
                              Pasar al pipeline
                            </MenuItem>
                          )}
                          <MenuItem onClick={() => setContactTarget([row.id])}>Contactar</MenuItem>
                          {triage !== "descartado" && (
                            <>
                              <MenuSeparator />
                              <MenuItem onClick={() => openPoolDialog([row.id])}>
                                Guardar en Talent Pool
                              </MenuItem>
                              <MenuItem destructive onClick={() => openRejectDialog(new Set([row.id]))}>
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

      <PostuladoDetailSheet
        postulado={detailRow}
        criterios={detailRow ? (criteriosByApplication[detailRow.id] ?? null) : null}
        screening={detailRow ? (screeningByApplication[detailRow.id] ?? []) : []}
        onClose={() => setDetailId(null)}
        onPasarAlPipeline={(r) => onPasarAlPipeline([r.id])}
        onContactar={(r) => setContactTarget([r.id])}
        onGuardarEnPool={(r) => openPoolDialog([r.id])}
        onDescartar={(r) => openRejectDialog(new Set([r.id]))}
      />

      <ContactarDialog
        target={contactTarget}
        jobId={jobId}
        jobTitle={jobTitle}
        onClose={() => setContactTarget(null)}
        onSent={() => setSelected(new Set())}
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
            Salen de esta búsqueda pero quedan marcados como talento disponible para futuras.
            No se les envía ningún mensaje.
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
            <span className="font-semibold text-text">Descartado</span>. Las que ya estén
            descartadas o en una etapa terminal se saltan.
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
            <Checkbox checked={notifyCandidate} onChange={() => setNotifyCandidate((v) => !v)} />
            Notificar al candidato
          </label>

          {notifyCandidate && (
            <div className="flex flex-col gap-1.5">
              <Textarea
                label="Mensaje para el candidato"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="resize-y"
              />
              <p className="text-[11px] text-muted">
                Variables: <code>{"{{candidato}}"}</code> y <code>{"{{puesto}}"}</code> ({jobTitle}
                ). No incluye la nota interna.
              </p>
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
              disabled={notifyCandidate && message.trim().length === 0}
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
      className={`py-2.5 pr-3 ${className}`}
      aria-sort={isActive ? (active.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 rounded text-xs font-semibold uppercase tracking-wide text-label transition-colors hover:text-text ${focusRing}`}
        aria-label={`Ordenar por ${label}`}
      >
        {label}
        <span className={isActive ? "text-primary" : "text-transparent"} aria-hidden>
          {isActive && active.dir === "asc" ? "↑" : "↓"}
        </span>
      </button>
    </th>
  );
}
