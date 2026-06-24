"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { actualizarPerfilAction } from "../actions";

const fieldClass =
  "w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]";

export function ProfileSection({
  fullName,
  email,
}: {
  fullName: string | null;
  email: string;
}) {
  const [state, dispatch, pending] = useActionState(actualizarPerfilAction, {});

  return (
    <form action={dispatch} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fullName" className="text-xs font-semibold text-muted">
          Nombre
        </label>
        <input id="fullName" name="fullName" defaultValue={fullName ?? ""} required className={fieldClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted">Email</label>
        <input value={email} disabled className={`${fieldClass} opacity-60`} />
        <span className="text-xs text-muted">El email se gestiona desde tu cuenta.</span>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        {state.ok && <span className="text-xs font-semibold text-success">Guardado ✓</span>}
        {state.error && <span className="text-xs text-danger">{state.error}</span>}
      </div>
    </form>
  );
}
