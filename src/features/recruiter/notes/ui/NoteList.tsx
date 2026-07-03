"use client";

import { useState } from "react";
import type { TimelineNote } from "../data/notes.queries";

type Props = {
  notes: TimelineNote[];
};

const VISIBLE_COUNT = 3;

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Lista de solo lectura de notas internas (tabla `notes`), cronológica + cap de
 * VISIBLE_COUNT con toggle "ver más/menos". Extraída de NoteTimeline para reusarla donde
 * no corresponde el form de alta (ej. bloques de búsquedas pasadas en el historial del
 * candidato).
 */
export function NoteList({ notes }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (notes.length === 0) {
    return <p className="text-xs text-muted">Sin notas registradas.</p>;
  }

  const hiddenCount = notes.length - VISIBLE_COUNT;
  const visibleNotes = expanded ? notes : notes.slice(-VISIBLE_COUNT);

  return (
    <div className="flex flex-col gap-2.5">
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="self-start text-xs font-medium text-primary hover:text-primary-hover"
        >
          {expanded ? "Ver menos" : `Ver ${hiddenCount} anteriores`}
        </button>
      )}
      <ul className="flex flex-col gap-2.5">
        {visibleNotes.map((note) => (
          <li
            key={note.id}
            className="rounded-[var(--radius)] border border-border bg-bg px-3 py-2"
          >
            <div className="mb-0.5 flex items-center justify-between gap-2 text-[11px] text-muted">
              <span className="font-semibold text-text/70">
                {note.authorName ?? "Equipo"}
              </span>
              <span className="tabular-nums">{dateFmt.format(note.createdAt)}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm text-text">{note.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
