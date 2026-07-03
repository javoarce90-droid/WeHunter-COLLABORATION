"use client";

import { useState } from "react";
import { STAGE_LABELS, REJECTION_REASON_LABELS } from "../schema";
import type { StageHistoryEvent } from "../data/applications.queries";

type Props = {
  events: StageHistoryEvent[];
};

const VISIBLE_COUNT = 3;

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * Timeline de solo lectura de los cambios de etapa de una postulación (tabla
 * `application_events`). Se diferencia visualmente de NoteTimeline (cards con
 * borde) porque es un log de sistema, no contenido autorado: puntos + línea
 * conectora, sin cajas, para que ambas secciones no se confundan al estar
 * apiladas en el sheet.
 */
export function StageHistoryTimeline({ events }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (events.length === 0) {
    return <p className="text-xs text-muted">Todavía no hay movimientos registrados.</p>;
  }

  const visible = expanded ? events : events.slice(0, VISIBLE_COUNT);
  const hiddenCount = events.length - VISIBLE_COUNT;

  return (
    <div className="flex flex-col gap-2">
      <ol className="relative flex flex-col gap-3 pl-4 before:absolute before:inset-y-1 before:left-[3px] before:w-px before:bg-border">
        {visible.map((event) => (
          <li key={event.id} className="relative">
            <span className="absolute -left-4 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
            <p className="text-sm text-text">
              {event.fromStage ? STAGE_LABELS[event.fromStage] : "Ingreso"}
              {" → "}
              {STAGE_LABELS[event.toStage]}
            </p>
            <p className="text-[11px] text-muted">
              {event.changedByName ?? "Equipo"} · <span className="tabular-nums">{dateFmt.format(event.createdAt)}</span>
            </p>
            {event.toStage === "rejected" && event.rejectionReason && (
              <p className="text-[11px] text-muted">
                Motivo: {REJECTION_REASON_LABELS[event.rejectionReason]}
                {event.rejectionNote ? ` — ${event.rejectionNote}` : ""}
              </p>
            )}
          </li>
        ))}
      </ol>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="self-start text-xs font-medium text-primary hover:text-primary-hover"
        >
          {expanded ? "Ver menos" : `Ver ${hiddenCount} anteriores`}
        </button>
      )}
    </div>
  );
}
