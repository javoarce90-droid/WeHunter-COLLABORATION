"use client";

import { useState, useTransition } from "react";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/lib/toast";
import { agregarEtiquetaAction, quitarEtiquetaAction } from "../actions";
import type { CandidateTagRow } from "../data/tags.queries";

type Props = {
  candidateId: string | null;
  candidateName: string;
  /** Solo para revalidar la vista desde donde se abrió (pipeline/postulados). */
  jobId?: string;
  tags: CandidateTagRow[];
  onClose: () => void;
};

/**
 * Diálogo rápido para etiquetar un candidato desde el menú de 3 puntos de una card. Estado
 * local optimista (agrega/saca el chip al toque); si la mutation falla, revierte.
 */
export function TagsDialog({ candidateId, candidateName, jobId, tags, onClose }: Props) {
  const toast = useToast();
  const [items, setItems] = useState(tags);
  const [draft, setDraft] = useState("");
  const [isPending, startTransition] = useTransition();

  function agregar() {
    const name = draft.trim();
    if (!name || !candidateId) return;
    setDraft("");
    startTransition(async () => {
      const res = await agregarEtiquetaAction({ candidateId, tagName: name, jobId });
      if (!res.ok || !res.tagId || !res.name) {
        toast({ message: res.error ?? "No se pudo agregar la etiqueta.", variant: "danger" });
        return;
      }
      const { tagId, name: tagName } = res;
      setItems((prev) => (prev.some((t) => t.id === tagId) ? prev : [...prev, { id: tagId, name: tagName }]));
    });
  }

  function quitar(tagId: string) {
    if (!candidateId) return;
    setItems((prev) => prev.filter((t) => t.id !== tagId));
    startTransition(async () => {
      const res = await quitarEtiquetaAction({ candidateId, tagId, jobId });
      if (!res.ok) {
        toast({ message: res.error ?? "No se pudo quitar la etiqueta.", variant: "danger" });
        setItems(tags);
      }
    });
  }

  return (
    <Dialog
      open={candidateId != null}
      onClose={onClose}
      side="center"
      title={`Etiquetas de ${candidateName}`}
      className="max-w-sm"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {items.length === 0 && (
            <p className="text-sm text-muted">Todavía no tiene etiquetas.</p>
          )}
          {items.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary-hover"
            >
              {t.name}
              <button
                type="button"
                onClick={() => quitar(t.id)}
                aria-label={`Quitar etiqueta ${t.name}`}
                className="text-primary-hover/70 outline-none hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            agregar();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ej: Referido, Bilingüe…"
            maxLength={40}
            className="h-9 flex-1 rounded-[var(--radius)] border border-border bg-bg px-3 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]"
          />
          <button
            type="submit"
            disabled={isPending || draft.trim().length === 0}
            className="rounded-[var(--radius)] bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            Agregar
          </button>
        </form>
      </div>
    </Dialog>
  );
}
