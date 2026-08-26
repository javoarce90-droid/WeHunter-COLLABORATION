"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { cambiarEstadoBusquedaAction } from "../actions";

/**
 * Diálogo de confirmación para la transición "Cerrar" (open/paused → closed): es terminal
 * para el proceso de selección, así que confirma antes de disparar la acción — mismo patrón
 * que `PublishConfirmDialog`. Controlado desde afuera para poder dispararse tanto desde un
 * botón propio (`CloseConfirmButton`) como desde un `MenuItem` (kebab de `JobsList`).
 */
export function CloseConfirmDialog({
  open,
  onClose,
  jobId,
  jobTitle,
}: {
  open: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
}) {
  return (
    <Dialog open={open} onClose={onClose} side="center" title={`¿Cerrar "${jobTitle}"?`}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text">Esta acción no se puede deshacer.</p>
        <form
          action={cambiarEstadoBusquedaAction}
          onSubmit={onClose}
          className="flex items-center justify-end gap-3"
        >
          <input type="hidden" name="jobId" value={jobId} />
          <input type="hidden" name="nuevoEstado" value="closed" />
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <SubmitButton variant="primary">Cerrar</SubmitButton>
        </form>
      </div>
    </Dialog>
  );
}

export function CloseConfirmButton({
  jobId,
  jobTitle,
  variant = "ghost",
}: {
  jobId: string;
  jobTitle: string;
  variant?: "primary" | "ghost";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size="sm"
        onClick={() => setOpen(true)}
        className={variant === "ghost" ? "hover:border-danger hover:text-danger" : undefined}
      >
        Cerrar
      </Button>
      <CloseConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        jobId={jobId}
        jobTitle={jobTitle}
      />
    </>
  );
}
