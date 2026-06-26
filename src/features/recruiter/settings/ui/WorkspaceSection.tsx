"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { editarWorkspaceAction } from "../actions";
import type { OrgSettings } from "../data/settings.queries";

const fieldClass =
  "w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]";

// Zonas horarias frecuentes en LatAm/ES. Lista corta (no exhaustiva) para no inflar el bundle.
const TIMEZONES = [
  "America/Argentina/Buenos_Aires",
  "America/Santiago",
  "America/Bogota",
  "America/Mexico_City",
  "America/Lima",
  "America/Montevideo",
  "America/Sao_Paulo",
  "Europe/Madrid",
  "UTC",
];

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
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

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
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-16 w-16 rounded-[var(--radius)] object-cover" />
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
            ref={fileRef}
            type="file"
            name="logo"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setPreview(f ? URL.createObjectURL(f) : null);
            }}
          />
          <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
            Cambiar logo
          </Button>
          <span className="text-xs text-muted">PNG, JPG o WEBP · máx. 2 MB</span>
        </div>
      </div>

      <div className="grid max-w-md gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted">Nombre del workspace</label>
          <input name="name" defaultValue={org.name} required className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted">Zona horaria</label>
          <select name="timezone" defaultValue={org.preferences?.timezone ?? ""} className={fieldClass}>
            <option value="">Sin definir</option>
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
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
