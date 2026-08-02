"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { cambiarEstadoBusquedaAction } from "../actions";

/**
 * Diálogo de confirmación para la transición "Publicar" (draft → open): a diferencia del
 * resto de las transiciones de estado, publicar hace visible el aviso en el career site y
 * empieza a recibir postulaciones, así que confirma antes de disparar la acción. Controlado
 * desde afuera para poder dispararse tanto desde un botón propio (`PublishConfirmButton`) como
 * desde un `MenuItem` (kebab de `JobsList`).
 */
export function PublishConfirmDialog({
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
    <Dialog open={open} onClose={onClose} side="center" title={`¿Publicar "${jobTitle}"?`}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text">
          El aviso queda visible en el career site y empieza a recibir postulaciones.
        </p>
        <form
          action={cambiarEstadoBusquedaAction}
          onSubmit={onClose}
          className="flex items-center justify-end gap-3"
        >
          <input type="hidden" name="jobId" value={jobId} />
          <input type="hidden" name="nuevoEstado" value="open" />
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <SubmitButton variant="primary">Publicar</SubmitButton>
        </form>
      </div>
    </Dialog>
  );
}

export function PublishConfirmButton({
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
      <Button type="button" variant={variant} size="sm" onClick={() => setOpen(true)}>
        Publicar
      </Button>
      <PublishConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        jobId={jobId}
        jobTitle={jobTitle}
      />
    </>
  );
}
