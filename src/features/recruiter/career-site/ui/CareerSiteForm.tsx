"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { editarCareerSiteAction } from "../actions";
import type { OrgSettings } from "@/features/recruiter/settings/data/settings.queries";

const fieldClass =
  "w-full rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]";

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function CareerSiteForm({
  org,
  coverUrl,
  canEdit,
}: {
  org: OrgSettings;
  coverUrl: string | null;
  canEdit: boolean;
}) {
  const [state, dispatch, pending] = useActionState(editarCareerSiteAction, {});
  const coverRef = useRef<HTMLInputElement>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const branding = org.branding;
  const [primaryColor, setPrimaryColor] = useState(branding?.primaryColor ?? "");
  const [accentColor, setAccentColor] = useState(branding?.accentColor ?? "");
  const [slug, setSlug] = useState(org.slug);

  if (!canEdit) {
    return (
      <p className="text-xs text-muted">
        Solo el owner o un admin pueden editar el Career Site. Podés ver cómo está configurado en
        la vista previa.
      </p>
    );
  }

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5 max-w-md">
        <label className="text-xs font-semibold text-muted">Dirección del Career Site</label>
        <div className="flex items-center overflow-hidden rounded-[var(--radius)] border border-border bg-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-[var(--focus-ring)]">
          <span className="shrink-0 border-r border-border bg-primary-light px-3 py-2 text-sm text-muted">
            /careers/
          </span>
          <input
            name="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            required
            className="w-full bg-transparent px-3 py-2 text-sm text-text outline-none"
          />
        </div>
        <span className="text-xs text-muted">Minúsculas, números y guiones. Cambiarlo rompe los links ya compartidos.</span>
      </div>

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

      <div className="flex items-center gap-4">
        {logoPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoPreview} alt="" className="h-16 w-16 rounded-[var(--radius)] object-cover" />
        ) : org.logoUrl ? (
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
          <span className="text-xs text-muted">
            PNG, JPG o WEBP · máx. 2 MB — mismo logo que usa el resto de WeHunter.
          </span>
        </div>
      </div>

      <div className="grid max-w-md gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted">Descripción institucional</label>
          <textarea
            name="description"
            defaultValue={branding?.description ?? ""}
            rows={6}
            maxLength={1000}
            className={fieldClass}
          />
          <span className="text-xs text-muted">
            Soporta Markdown: **negrita**, listas con &quot;-&quot;, links. Emojis van directo 🎉.
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-muted">Color primario</label>
              <Tooltip label="Tiñe todo el sitio: fondos, botones y estados activos." align="start">
                <span
                  tabIndex={0}
                  aria-label="Qué hace el color primario"
                  className="grid h-3.5 w-3.5 cursor-help place-items-center rounded-full text-[9px] font-bold text-muted ring-1 ring-border"
                >
                  ?
                </span>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="h-9 w-9 shrink-0 rounded-[var(--radius)] border border-border"
                style={{ backgroundColor: HEX_COLOR.test(primaryColor) ? primaryColor : "transparent" }}
                aria-hidden
              />
              <input
                name="primaryColor"
                type="text"
                placeholder="#6D28D9"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-semibold text-muted">Color de acento</label>
              <Tooltip label="Solo el botón de 'Postularme' en cada aviso. Sin definir, usa el primario." align="start">
                <span
                  tabIndex={0}
                  aria-label="Qué hace el color de acento"
                  className="grid h-3.5 w-3.5 cursor-help place-items-center rounded-full text-[9px] font-bold text-muted ring-1 ring-border"
                >
                  ?
                </span>
              </Tooltip>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="h-9 w-9 shrink-0 rounded-[var(--radius)] border border-border"
                style={{ backgroundColor: HEX_COLOR.test(accentColor) ? accentColor : "transparent" }}
                aria-hidden
              />
              <input
                name="accentColor"
                type="text"
                placeholder="#F59E0B"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-muted">Sitio web</label>
          <input
            name="website"
            type="text"
            inputMode="url"
            placeholder="tu-empresa.com"
            defaultValue={branding?.website ?? ""}
            className={fieldClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted">LinkedIn</label>
            <input
              name="linkedinUrl"
              type="text"
              inputMode="url"
              placeholder="linkedin.com/company/..."
              defaultValue={branding?.social?.linkedin ?? ""}
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted">Instagram</label>
            <input
              name="instagramUrl"
              type="text"
              inputMode="url"
              placeholder="instagram.com/..."
              defaultValue={branding?.social?.instagram ?? ""}
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted">X</label>
            <input
              name="xUrl"
              type="text"
              inputMode="url"
              placeholder="x.com/..."
              defaultValue={branding?.social?.x ?? ""}
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-muted">Facebook</label>
            <input
              name="facebookUrl"
              type="text"
              inputMode="url"
              placeholder="facebook.com/..."
              defaultValue={branding?.social?.facebook ?? ""}
              className={fieldClass}
            />
          </div>
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
