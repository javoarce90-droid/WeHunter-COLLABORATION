"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { editarWorkspaceAction } from "../actions";
import type { OrgSettings } from "../data/settings.queries";

const fieldClass =
  "w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]";

export function WorkspaceSection({
  org,
  hasLogo,
  coverUrl,
  canEdit,
}: {
  org: OrgSettings;
  hasLogo: boolean;
  coverUrl: string | null;
  canEdit: boolean;
}) {
  const [state, dispatch, pending] = useActionState(editarWorkspaceAction, {});
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const branding = org.branding;

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
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Workspace</p>

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
        <input name="name" defaultValue={org.name} required className={fieldClass} />
      </div>

      <p className="mt-2 border-t border-border pt-4 text-xs font-semibold uppercase tracking-wide text-muted">
        Career Site
      </p>

      <div className="flex items-center gap-4">
        {coverPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverPreview} alt="" className="h-20 w-36 rounded-[var(--radius)] object-cover" />
        ) : coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="h-20 w-36 rounded-[var(--radius)] object-cover" />
        ) : (
          <span className="grid h-20 w-36 place-items-center rounded-[var(--radius)] bg-primary-light text-xs font-semibold text-primary-hover">
            Sin portada
          </span>
        )}
        <div className="flex flex-col gap-1.5">
          <input
            ref={coverRef}
            type="file"
            name="cover"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setCoverPreview(f ? URL.createObjectURL(f) : null);
            }}
          />
          <Button type="button" variant="secondary" onClick={() => coverRef.current?.click()}>
            Cambiar portada
          </Button>
          <span className="text-xs text-muted">PNG, JPG o WEBP · máx. 2 MB</span>
        </div>
      </div>

      <div className="grid max-w-md gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted">Descripción institucional</label>
          <textarea
            name="description"
            defaultValue={branding?.description ?? ""}
            rows={3}
            maxLength={1000}
            className={fieldClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted">Color primario</label>
            <input
              name="primaryColor"
              type="text"
              placeholder="#6D28D9"
              defaultValue={branding?.primaryColor ?? ""}
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted">Color de acento</label>
            <input
              name="accentColor"
              type="text"
              placeholder="#F59E0B"
              defaultValue={branding?.accentColor ?? ""}
              className={fieldClass}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted">Sitio web</label>
          <input
            name="website"
            type="url"
            placeholder="https://"
            defaultValue={branding?.website ?? ""}
            className={fieldClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted">LinkedIn</label>
            <input
              name="linkedinUrl"
              type="url"
              placeholder="https://linkedin.com/company/..."
              defaultValue={branding?.social?.linkedin ?? ""}
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted">Instagram</label>
            <input
              name="instagramUrl"
              type="url"
              placeholder="https://instagram.com/..."
              defaultValue={branding?.social?.instagram ?? ""}
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted">X</label>
            <input
              name="xUrl"
              type="url"
              placeholder="https://x.com/..."
              defaultValue={branding?.social?.x ?? ""}
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted">Facebook</label>
            <input
              name="facebookUrl"
              type="url"
              placeholder="https://facebook.com/..."
              defaultValue={branding?.social?.facebook ?? ""}
              className={fieldClass}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-[var(--radius)] border border-border px-3 py-2.5">
        <Checkbox
          name="careerSiteEnabled"
          value="true"
          defaultChecked={org.careerSiteEnabled}
          label="Publicar el Career Site"
        />
        <a
          href={`/careers/${org.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-primary hover:underline"
        >
          Ver Career Site →
        </a>
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
