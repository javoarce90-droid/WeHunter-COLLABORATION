"use client";

import { useState, useTransition } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { eliminarCuentaAction } from "../actions";

export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function handleConfirm() {
    start(async () => {
      const result = await eliminarCuentaAction();
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius)] border border-danger/30 bg-danger/5 p-4">
      <p className="text-sm font-bold text-text">Eliminar mi cuenta</p>
      <p className="text-xs text-muted">
        Borra tu nombre, email, CV, experiencia, educación y certificaciones de forma
        permanente, y cerrás sesión para siempre. No podés deshacer esta acción.
      </p>
      <Button
        type="button"
        variant="destructive"
        className="mt-1 w-fit"
        onClick={() => setOpen(true)}
      >
        Eliminar mi cuenta
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} side="center" title="Eliminar tu cuenta">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text">
            Esta acción es <strong>permanente e irreversible</strong>. Vamos a borrar tu nombre,
            email, teléfono, CV, experiencia, educación y certificaciones, y ya no vas a poder
            volver a entrar con esta cuenta.
          </p>
          <p className="text-xs text-muted">
            Tus postulaciones ya enviadas quedan como registro de las organizaciones a las que
            aplicaste, pero sin ninguno de tus datos personales asociados.
          </p>
          {error && <p className="text-xs font-semibold text-danger">{error}</p>}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirm} disabled={pending}>
              {pending ? "Eliminando…" : "Sí, eliminar mi cuenta"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
