"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { editarWorkspaceAction } from "../actions";
import type { OrgSettings } from "../data/settings.queries";

export function WorkspaceSection({
  org,
  hasLogo,
  canEdit,
}: {
  org: OrgSettings;
  hasLogo: boolean;
  canEdit: boolean;
}) {
  const [state, dispatch, pending] = useActionState(editarWorkspaceAction, {});
  const logoRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  if (!canEdit) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/settings/logo" alt="" className="h-12 w-12 rounded-[var(--radius)] object-cover" />
          ) : null}
          <p className="text-sm font-semibold text-text">{org.name}</p>
        </div>
        <p className="text-xs text-muted">Solo el owner o un admin pueden editar el workspace.</p>
      </div>
    );
  }

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        {logoPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoPreview} alt="" className="h-16 w-16 rounded-[var(--radius)] object-cover" />
        ) : hasLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/settings/logo" alt="" className="h-16 w-16 rounded-[var(--radius)] object-cover" />
        ) : (
          <span className="grid h-16 w-16 place-items-center rounded-[var(--radius)] bg-primary-light text-lg font-bold text-primary-hover">
            {org.name.slice(0, 2).toUpperCase()}
          </span>
        )}
        <div className="flex flex-col gap-1.5">
          <input
            ref={logoRef}
            type="file"
            name="logo"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setLogoPreview(f ? URL.createObjectURL(f) : null);
            }}
          />
          <Button type="button" variant="secondary" onClick={() => logoRef.current?.click()}>
            Cambiar logo
          </Button>
          <span className="text-xs text-muted">PNG, JPG o WEBP · máx. 2 MB</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 max-w-md">
        <label className="text-xs font-semibold text-muted">Nombre del workspace</label>
        <input
          name="name"
          defaultValue={org.name}
          required
          className="w-full rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]"
        />
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
