"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Menu, MenuItem, MenuLabel } from "@/components/ui/menu";
import { IconButton } from "@/components/ui/icon-button";
import { AiScore, AiButton } from "@/components/ui/ai";
import { useToast } from "@/lib/toast";
import { CANDIDATE_SOURCE_LABELS } from "@/features/recruiter/candidates/ui/source-meta";
import type { CandidateSource } from "@/features/recruiter/candidates/domain/candidate-details";
import {
  APPLICATION_STAGES,
  STAGE_LABELS,
  REJECTION_REASONS,
  REJECTION_REASON_LABELS,
  DEFAULT_REJECTION_MESSAGE,
} from "../schema";
import type { ApplicationStage, RejectionReason } from "../schema";
import type { PostuladoRow } from "../data/applications.queries";
import { isTerminal } from "./stage-visual";
import {
  moverEtapaAction,
  marcarFavoritoAction,
  rechazarVariosAction,
  analizarPostuladosAction,
} from "../actions";

type Props = {
  jobId: string;
  jobTitle: string;
  postulados: PostuladoRow[];
};

const fieldClass =
  "w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]";
const labelClass = "text-xs font-semibold text-muted";

type SortKey = "candidate" | "stage" | "date" | "match";
type SortDir = "asc" | "desc";

const STAGE_ORDER = new Map(APPLICATION_STAGES.map((s, i) => [s, i]));
const dateFmt = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric" });

function sourceLabel(source: string | null): string {
  if (!source) return "—";
  return CANDIDATE_SOURCE_LABELS[source as CandidateSource] ?? source;
}

export function PostuladosTable({ jobId, jobTitle, postulados }: Props) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // ids que se están por rechazar en el dialog abierto (null = cerrado). Individual y en
  // lote comparten el mismo dialog; no reusa `selected` porque el individual (vía menú de
  // fila) no debe tocar la selección de checkboxes.
  const [rejectTarget, setRejectTarget] = useState<Set<string> | null>(null);
  const [reason, setReason] = useState<RejectionReason>(REJECTION_REASONS[0]);
  const [note, setNote] = useState("");
  const [notifyCandidate, setNotifyCandidate] = useState(false);
  const [message, setMessage] = useState(DEFAULT_REJECTION_MESSAGE);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "date", dir: "desc" });

  const [rows, applyPatch] = useOptimistic(
    postulados,
    (state, patch: { id: string; changes: Partial<PostuladoRow> }) =>
      state.map((r) => (r.id === patch.id ? { ...r, ...patch.changes } : r)),
  );

  const sorted = useMemo(() => {
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (sort.key === "candidate") cmp = a.candidate.fullName.localeCompare(b.candidate.fullName);
      else if (sort.key === "stage")
        cmp = (STAGE_ORDER.get(a.stage) ?? 0) - (STAGE_ORDER.get(b.stage) ?? 0);
      else if (sort.key === "match") {
        // Sin score va siempre al final, sin importar la dirección.
        if (a.aiScore == null && b.aiScore == null) cmp = 0;
        else if (a.aiScore == null) return 1;
        else if (b.aiScore == null) return -1;
        else cmp = a.aiScore - b.aiScore;
      } else cmp = a.createdAt.getTime() - b.createdAt.getTime();
      return cmp * factor;
    });
  }, [rows, sort]);

  if (postulados.length === 0) {
    return (
      <EmptyState
        title="Todavía no hay postulados"
        description={
          <>
            Postulá candidatos del pool a esta búsqueda desde el{" "}
            <span className="font-semibold text-text">Pipeline</span> y aparecerán acá para
            triage rápido.
          </>
        }
      />
    );
  }

  const allSelected = sorted.length > 0 && sorted.every((r) => selected.has(r.id));
  const someSelected = sorted.some((r) => selected.has(r.id));

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

  function onMove(row: PostuladoRow, toStage: ApplicationStage) {
    if (row.stage === toStage || isTerminal(row.stage)) return;
    startTransition(async () => {
      applyPatch({ id: row.id, changes: { stage: toStage } });
      const fd = new FormData();
      fd.set("applicationId", row.id);
      fd.set("newStage", toStage);
      const res = await moverEtapaAction({}, fd);
      if (res.error) toast({ message: res.error, variant: "danger" });
      else
        toast({
          message: `${row.candidate.fullName} → ${STAGE_LABELS[toStage]}`,
          variant: "success",
        });
    });
  }

  function onAnalizar() {
    startTransition(async () => {
      const res = await analizarPostuladosAction(jobId);
      if (!res.ok) toast({ message: res.error ?? "No se pudo analizar.", variant: "danger" });
      else
        toast({
          message: `${res.scored} postulado${res.scored !== 1 ? "s" : ""} analizado${res.scored !== 1 ? "s" : ""} con IA`,
          variant: "success",
        });
    });
  }

  function openRejectDialog(ids: Set<string>) {
    setRejectTarget(ids);
    setReason(REJECTION_REASONS[0]);
    setNote("");
    setNotifyCandidate(false);
    setMessage(DEFAULT_REJECTION_MESSAGE);
  }

  function closeRejectDialog() {
    setRejectTarget(null);
  }

  function doReject() {
    if (!rejectTarget) return;
    const ids = [...rejectTarget];
    closeRejectDialog();
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {postulados.length} postulado{postulados.length !== 1 ? "s" : ""}
        </p>
        <AiButton onClick={onAnalizar} title="Calcular compatibilidad de cada candidato con la búsqueda">
          Analizar con IA
        </AiButton>
      </div>

      {/* Barra de selección */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-primary/30 bg-primary-light px-4 py-2.5">
          <span className="text-sm font-semibold text-primary-hover">
            {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
          </span>
          <Button size="sm" variant="destructive" onClick={() => openRejectDialog(selected)}>
            Rechazar
          </Button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-sm font-semibold text-muted hover:text-text"
          >
            Limpiar
          </button>
        </div>
      )}

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
              <th className="hidden py-2.5 pr-3 text-xs font-semibold uppercase tracking-wide text-muted md:table-cell">
                Fuente
              </th>
              <SortableTh label="Match" active={sort} sortKey="match" onSort={setSortKey} />
              <SortableTh label="Etapa" active={sort} sortKey="stage" onSort={setSortKey} />
              <SortableTh label="Postulado" active={sort} sortKey="date" onSort={setSortKey} className="hidden sm:table-cell" />
              <th className="py-2.5 pr-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((row) => {
              const isSelected = selected.has(row.id);
              const terminal = isTerminal(row.stage);
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
                        className="shrink-0 text-muted transition-colors hover:text-warning"
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
                        <Link
                          href={`/candidates/${row.candidate.id}`}
                          className="block truncate font-semibold text-text transition-colors hover:text-primary"
                        >
                          {row.candidate.fullName}
                        </Link>
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
                  <td className="py-2.5 pr-3">
                    {row.aiScore != null ? (
                      <AiScore score={row.aiScore} size={28} detail={row.aiSummary} />
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3">
                    <Badge variant={row.stage}>{STAGE_LABELS[row.stage]}</Badge>
                  </td>
                  <td className="hidden py-2.5 pr-3 text-muted tabular-nums sm:table-cell">
                    {dateFmt.format(row.createdAt)}
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="flex justify-end">
                      {!terminal && (
                        <Menu
                          align="end"
                          trigger={
                            <IconButton aria-label="Mover de etapa" size="sm" variant="ghost">
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                                <circle cx="8" cy="3" r="1.4" />
                                <circle cx="8" cy="8" r="1.4" />
                                <circle cx="8" cy="13" r="1.4" />
                              </svg>
                            </IconButton>
                          }
                        >
                          <MenuLabel>Mover a</MenuLabel>
                          {APPLICATION_STAGES.filter((s) => s !== row.stage).map((s) => (
                            <MenuItem
                              key={s}
                              destructive={s === "rejected"}
                              onClick={() =>
                                s === "rejected"
                                  ? openRejectDialog(new Set([row.id]))
                                  : onMove(row, s)
                              }
                            >
                              {STAGE_LABELS[s]}
                            </MenuItem>
                          ))}
                        </Menu>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog
        open={rejectTarget != null}
        onClose={closeRejectDialog}
        side="center"
        title={`¿Rechazar ${rejectTarget?.size ?? 0} postulación${(rejectTarget?.size ?? 0) !== 1 ? "es" : ""}?`}
        className="max-w-md"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Las postulaciones seleccionadas pasarán a{" "}
            <span className="font-semibold text-text">Descartado</span>. Las que ya estén
            descartadas o en una etapa terminal se saltan.
          </p>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="reject-reason" className={labelClass}>
              Motivo de descarte (interno, no lo ve el candidato)
            </label>
            <select
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as RejectionReason)}
              className={fieldClass}
            >
              {REJECTION_REASONS.map((r) => (
                <option key={r} value={r}>
                  {REJECTION_REASON_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="reject-note" className={labelClass}>
              Nota interna (opcional)
            </label>
            <textarea
              id="reject-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Solo la ve el equipo de reclutamiento."
              className={`${fieldClass} resize-none`}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-text">
            <Checkbox
              checked={notifyCandidate}
              onChange={() => setNotifyCandidate((v) => !v)}
            />
            Notificar al candidato
          </label>

          {notifyCandidate && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="reject-message" className={labelClass}>
                Mensaje para el candidato
              </label>
              <textarea
                id="reject-message"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={`${fieldClass} resize-y`}
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
              onClick={closeRejectDialog}
              className="text-sm font-semibold text-muted hover:text-text"
            >
              Cancelar
            </button>
            <Button
              variant="destructive"
              disabled={notifyCandidate && message.trim().length === 0}
              onClick={doReject}
            >
              Rechazar
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
        className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted transition-colors hover:text-text"
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
