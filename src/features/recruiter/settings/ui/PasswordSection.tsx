"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { cambiarContrasenaAction } from "../actions";

const fieldClass =
  "w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]";

export function PasswordSection() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, dispatch, pending] = useActionState(
    async (prev: { error?: string; ok?: boolean }, formData: FormData) => {
      const result = await cambiarContrasenaAction(prev, formData);
      if (result.ok) formRef.current?.reset();
      return result;
    },
    {},
  );

  return (
    <form ref={formRef} action={dispatch} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-xs font-semibold text-muted">
          Nueva contraseña
        </label>
        <input id="password" name="password" type="password" required minLength={8} className={fieldClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirm" className="text-xs font-semibold text-muted">
          Repetir contraseña
        </label>
        <input id="confirm" name="confirm" type="password" required minLength={8} className={fieldClass} />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Actualizando…" : "Cambiar contraseña"}
        </Button>
        {state.ok && <span className="text-xs font-semibold text-success">Actualizada ✓</span>}
        {state.error && <span className="text-xs text-danger">{state.error}</span>}
      </div>
    </form>
  );
}
