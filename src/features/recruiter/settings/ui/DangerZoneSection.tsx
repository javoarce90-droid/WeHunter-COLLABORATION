"use client";

import { useActionState, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { eliminarWorkspaceAction } from "../actions";

const fieldClass =
  "w-full rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]";

export function DangerZoneSection({ organizationName }: { organizationName: string }) {
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [state, dispatch, pending] = useActionState(eliminarWorkspaceAction, {});
  const matches = confirmName.trim() === organizationName.trim();

  return (
    <div className="flex items-center justify-between gap-4 rounded-[var(--radius)] border border-danger/30 bg-danger/5 p-4">
      <div>
        <p className="text-sm font-bold text-text">Eliminar workspace</p>
        <p className="text-xs text-muted">
          Se borran búsquedas, candidatos y conversaciones. No se puede deshacer.
        </p>
      </div>
      <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
        Eliminar workspace
      </Button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        side="center"
        title={`Eliminar ${organizationName}`}
      >
        <form action={dispatch} className="flex flex-col gap-4">
          <p className="text-sm text-text">
            Esta acción <strong>no se puede deshacer</strong>. Se van a borrar todas las
            búsquedas, candidatos y conversaciones de este workspace. Los clientes pierden el
            acceso a sus links.
          </p>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted">
              Escribí <span className="font-bold text-text">{organizationName}</span> para confirmar
            </label>
            <input
              name="confirmName"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={organizationName}
              autoComplete="off"
              className={fieldClass}
            />
          </div>
          {state.error && <p className="text-xs font-semibold text-danger">{state.error}</p>}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={!matches || pending}>
              {pending ? "Eliminando…" : "Eliminar definitivamente"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
