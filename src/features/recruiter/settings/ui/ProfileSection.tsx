"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { PhoneInput } from "@/components/ui/phone-input";
import { SkillsPillsInput } from "@/features/candidate/profile/ui/SkillsPillsInput";
import { actualizarPerfilAction } from "../actions";
import type { OwnProfile } from "../data/settings.queries";
import { evaluarElegibilidadComunidad } from "../domain/evaluar-elegibilidad-comunidad";

const fieldClass =
  "w-full rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]";

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
  showCommunityCheckbox = true,
}: {
  profile: OwnProfile | null;
  email: string;
  hasAvatar: boolean;
  /** Sourcer y Hiring Manager no pueden aparecer en la Comunidad (docs/BACKLOG.md). Al
   *  ocultar el checkbox, el submit manda `visibleInCommunity: false` igual (el action lee
   *  `formData.get("visibleInCommunity") === "on"` — ausente = false), así que también
   *  corrige el valor si ya estaba en true de antes. */
  showCommunityCheckbox?: boolean;
}) {
  const [state, dispatch, pending] = useActionState(actualizarPerfilAction, {});
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [fullName, setFullName] = useState(profile?.fullName ?? "");
  const [jobTitle, setJobTitle] = useState(profile?.jobTitle ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const elegibilidadComunidad = evaluarElegibilidadComunidad({ fullName, jobTitle, bio });

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
          <Avatar name={fullName || email} size="lg" className="h-16 w-16 text-base" />
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
          <input
            name="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className={fieldClass}
          />
        </Field>
        <Field label="Email">
          <input value={email} disabled className={`${fieldClass} opacity-60`} />
        </Field>
        <Field label="Cargo">
          <input
            name="jobTitle"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className={fieldClass}
            placeholder="Ej. Talent Acquisition Lead"
          />
        </Field>
        <PhoneInput label="Teléfono" name="phone" value={phone} onChange={(v) => setPhone(v ?? "")} />
        <Field label="Ubicación">
          <input name="location" defaultValue={profile?.location ?? ""} className={fieldClass} placeholder="Ciudad, país" />
        </Field>
        <Field label="LinkedIn">
          <input name="linkedinUrl" inputMode="url" defaultValue={profile?.linkedinUrl ?? ""} className={fieldClass} placeholder="linkedin.com/in/…" />
        </Field>
        <Field label="Años de experiencia">
          <input
            name="yearsOfExperience"
            type="number"
            min={0}
            max={60}
            defaultValue={profile?.yearsOfExperience ?? ""}
            className={fieldClass}
            placeholder="Ej. 8"
          />
        </Field>
      </div>

      <SkillsPillsInput
        name="specialties"
        label="Especialidades"
        initialSkills={profile?.specialties ?? []}
        placeholder="Ej. Tecnología, Producto, Fintech…"
        helpText="Presioná Enter o coma para agregar cada una. Se muestran en tu card de la Comunidad."
      />

      <Field label="Bio (máx. 500 caracteres)">
        <textarea
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={500}
          rows={3}
          className={`${fieldClass} resize-y`}
          placeholder="Un resumen breve sobre vos."
        />
      </Field>

      {showCommunityCheckbox && (
        <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-bg p-4">
          <Checkbox
            name="visibleInCommunity"
            defaultChecked={profile?.visibleInCommunity ?? false}
            label="Aparecer en la Comunidad WeHunter"
            helpText="Activá esto para que tu perfil sea visible en el directorio público de recruiters. Por defecto no aparecés."
          />

          {elegibilidadComunidad.elegible ? (
            <p className="flex items-center gap-2 text-xs font-semibold text-success">
              <span aria-hidden>✓</span> Cumplís los requisitos para aparecer en la Comunidad.
            </p>
          ) : (
            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted">
                Para aparecer en la Comunidad, completá:
              </p>
              <ul className="flex flex-col gap-2">
                {elegibilidadComunidad.requisitos.map((r) => (
                  <li key={r.campo} className="flex items-center gap-2 text-xs">
                    <span
                      className={[
                        "grid h-4 w-4 shrink-0 place-items-center rounded border text-[10px] font-bold",
                        r.cumplido
                          ? "border-primary bg-primary text-white"
                          : "border-border text-transparent",
                      ].join(" ")}
                      aria-hidden
                    >
                      ✓
                    </span>
                    <span className={r.cumplido ? "text-muted line-through" : "text-text"}>
                      {r.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        {state.ok && !pending && <span className="text-xs font-semibold text-success">Guardado ✓</span>}
        {state.error && <span className="text-xs text-danger">{state.error}</span>}
      </div>
    </form>
  );
}
