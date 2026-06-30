"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { actualizarPerfilAction } from "../actions";
import type { OwnProfile } from "../data/settings.queries";

const fieldClass =
  "w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-muted">{label}</label>
      {children}
    </div>
  );
}

const dateFmt = new Intl.DateTimeFormat("es", { month: "long", year: "numeric" });

export function ProfileSection({
  profile,
  email,
  hasAvatar,
}: {
  profile: OwnProfile | null;
  email: string;
  hasAvatar: boolean;
}) {
  const [state, dispatch, pending] = useActionState(actualizarPerfilAction, {});
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const name = profile?.fullName ?? "";

  return (
    <form action={dispatch} className="flex flex-col gap-5">
      {/* Avatar + "miembro desde" */}
      <div className="flex items-center gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : hasAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/settings/avatar" alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <Avatar name={name || email} size="lg" className="h-16 w-16 text-base" />
        )}
        <div className="flex flex-col gap-1.5">
          <input
            ref={fileRef}
            type="file"
            name="avatar"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setPreview(f ? URL.createObjectURL(f) : null);
            }}
          />
          <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
            Cambiar foto
          </Button>
          {profile?.createdAt && (
            <span className="text-xs text-muted">
              En WeHunter desde {dateFmt.format(new Date(profile.createdAt))}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre">
          <input name="fullName" defaultValue={name} required className={fieldClass} />
        </Field>
        <Field label="Email">
          <input value={email} disabled className={`${fieldClass} opacity-60`} />
        </Field>
        <Field label="Cargo">
          <input name="jobTitle" defaultValue={profile?.jobTitle ?? ""} className={fieldClass} placeholder="Ej. Talent Acquisition Lead" />
        </Field>
        <Field label="Teléfono">
          <input name="phone" defaultValue={profile?.phone ?? ""} className={fieldClass} />
        </Field>
        <Field label="Ubicación">
          <input name="location" defaultValue={profile?.location ?? ""} className={fieldClass} placeholder="Ciudad, país" />
        </Field>
        <Field label="LinkedIn">
          <input name="linkedinUrl" defaultValue={profile?.linkedinUrl ?? ""} className={fieldClass} placeholder="https://linkedin.com/in/…" />
        </Field>
      </div>

      <Field label="Bio (máx. 500 caracteres)">
        <textarea
          name="bio"
          defaultValue={profile?.bio ?? ""}
          maxLength={500}
          rows={3}
          className={`${fieldClass} resize-y`}
          placeholder="Un resumen breve sobre vos."
        />
      </Field>

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
