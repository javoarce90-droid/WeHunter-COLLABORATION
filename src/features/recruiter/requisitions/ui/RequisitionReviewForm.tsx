"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { aprobarRequisitionAction, rechazarRequisitionAction } from "../actions";
import type { RequisitionReviewState } from "../actions";

const textareaClass =
  "w-full min-h-24 resize-y rounded-[var(--radius)] border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[rgba(123,47,219,0.2)]";

/**
 * Aprobar genera la búsqueda en borrador y redirige a editarla; rechazar exige un motivo,
 * que es lo único que el cliente ve como respuesta en su portal.
 */
export function RequisitionReviewForm({ requisitionId }: { requisitionId: string }) {
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");

  const [approveState, approveDispatch, approvePending] = useActionState<
    RequisitionReviewState,
    FormData
  >(async (prev, formData) => aprobarRequisitionAction(prev, formData), {});

  const [rejectState, rejectDispatch, rejectPending] = useActionState<
    RequisitionReviewState,
    FormData
  >(async (prev, formData) => rechazarRequisitionAction(prev, formData), {});

  if (mode === "idle") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => setMode("approve")}>
          Aprobar y crear la búsqueda
        </Button>
        <Button type="button" variant="secondary" onClick={() => setMode("reject")}>
          Rechazar
        </Button>
      </div>
    );
  }

  const approving = mode === "approve";
  const state = approving ? approveState : rejectState;
  const pending = approving ? approvePending : rejectPending;

  return (
    <form
      action={approving ? approveDispatch : rejectDispatch}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="requisitionId" value={requisitionId} />

      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted">
          {approving ? "Comentario para el cliente (opcional)" : "Motivo del rechazo *"}
        </span>
        <textarea
          name="reviewNote"
          maxLength={2000}
          required={!approving}
          className={textareaClass}
          placeholder={
            approving
              ? "Arrancamos la semana que viene."
              : "Contale al cliente por qué no avanzamos con esta búsqueda."
          }
        />
      </label>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" variant={approving ? "primary" : "destructive"} disabled={pending}>
          {pending
            ? approving
              ? "Aprobando…"
              : "Rechazando…"
            : approving
              ? "Confirmar y crear la búsqueda"
              : "Confirmar rechazo"}
        </Button>
        <button
          type="button"
          onClick={() => setMode("idle")}
          className="text-xs font-semibold text-muted hover:text-text"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
