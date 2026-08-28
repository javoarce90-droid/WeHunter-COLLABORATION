"use client";

import { useState } from "react";
import { AiButton, SparkleIcon } from "@/components/ui/ai";
import { Tooltip } from "@/components/ui/tooltip";
import { puedeGenerarInforme } from "../domain/generar-informe-entrevista";
import { InterviewReportDialog } from "./InterviewReportDialog";

type Props = {
  interviewId: string;
  candidateName: string;
  scheduledAt: Date;
  status: string;
  /** Evita que un click acá dispare el `onClick` de la fila que lo contiene (ver
   *  `AgendaView.tsx`, mismo criterio que el link al candidato en esa fila). */
  stopPropagation?: boolean;
  /** "button" (default): `AiButton` completo, para filas con espacio (Agenda). "link": texto
   *  chico que espeja el peso de "Editar"/"Eliminar" de esa fila (Pipeline) — un `AiButton`
   *  ahí competía en tamaño con vecinos de 11px y rompía la jerarquía de la fila. */
  variant?: "button" | "link";
};

/**
 * Único disparador del informe de entrevista con IA — vive en la ficha de la entrevista
 * (Pipeline) y en Agenda, siempre visible. Se habilita solo cuando la entrevista ya pasó y no
 * fue cancelada (`puedeGenerarInforme`, mismo criterio que el dominio) — no hace falta que el
 * recruiter la haya marcado "Realizada" a mano primero: generar el informe ya deja la
 * entrevista en ese estado.
 */
export function InterviewReportButton({
  interviewId,
  candidateName,
  scheduledAt,
  status,
  stopPropagation,
  variant = "button",
}: Props) {
  const [open, setOpen] = useState(false);
  const enabled = puedeGenerarInforme({ scheduledAt, status }, new Date());
  const disabledReason =
    status === "cancelled"
      ? "La entrevista fue cancelada."
      : "Vas a poder generar el informe cuando se realice la entrevista.";

  function handleClick(e: React.MouseEvent) {
    if (stopPropagation) e.stopPropagation();
    if (!enabled) return;
    setOpen(true);
  }

  const trigger =
    variant === "link" ? (
      <button
        type="button"
        disabled={!enabled}
        onClick={handleClick}
        className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-hover disabled:cursor-not-allowed disabled:text-muted disabled:hover:text-muted"
      >
        <SparkleIcon size={10} /> Informe
      </button>
    ) : (
      <AiButton type="button" variant="outline" disabled={!enabled} onClick={handleClick}>
        Informe
      </AiButton>
    );

  return (
    <>
      {enabled ? trigger : <Tooltip label={disabledReason}>{trigger}</Tooltip>}
      {/* El diálogo queda anidado en el DOM adentro de esta fila (no hay portal en `Dialog`) —
       *  en Agenda esa fila entera es clickeable (abre "Detalle de la entrevista"). Sin cortar
       *  la propagación acá, cualquier click DENTRO del diálogo ya abierto (tipear en el
       *  textarea, tocar un input) burbujea hasta la fila y dispara ese otro modal encima —
       *  bug real reportado por el usuario, no una precaución de más. */}
      <div onClick={(e) => e.stopPropagation()}>
        <InterviewReportDialog
          interviewId={interviewId}
          candidateName={candidateName}
          open={open}
          onClose={() => setOpen(false)}
        />
      </div>
    </>
  );
}
