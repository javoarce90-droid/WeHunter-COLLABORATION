"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { postularAction, type PostularActionState } from "../actions";
import { accentStyle } from "@/features/candidate/career-site/ui/brand";
import type { CareerSiteJobDetail } from "@/features/candidate/career-site/data/career-site.data";

const fieldClass =
  "w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]";

const initialState: PostularActionState = {};

export function ApplyForm({
  slug,
  job,
  defaultName,
  defaultEmail,
  accentColor,
}: {
  slug: string;
  job: CareerSiteJobDetail;
  defaultName: string;
  defaultEmail: string;
  accentColor?: string;
}) {
  const [state, formAction, pending] = useActionState(postularAction, initialState);

  if (state.ok) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-surface p-6 text-center shadow-[var(--shadow)]">
        <p className="text-sm font-semibold text-text">¡Listo! Tu postulación fue enviada.</p>
        <p className="mt-1 text-xs text-muted">El equipo de reclutamiento la va a revisar pronto.</p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-[var(--radius)] border border-border bg-surface p-6 shadow-[var(--shadow)]"
    >
      <input type="hidden" name="jobId" value={job.id} />
      <input type="hidden" name="slug" value={slug} />
      <h2 className="font-display text-base font-bold text-text">Postularme a {job.title}</h2>

      <Input label="Nombre completo" name="fullName" defaultValue={defaultName} required />
      <Input label="Email" name="email" type="email" defaultValue={defaultEmail} required />
      <Input label="Teléfono (opcional)" name="phone" type="tel" />

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted">Mensaje (opcional)</label>
        <textarea name="coverNote" rows={4} maxLength={2000} className={fieldClass} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted">CV</label>
        <div className={fieldClass}>
          <input
            type="file"
            name="cv"
            accept=".pdf,.doc,.docx"
            required
            className="w-full text-sm text-text file:mr-3 file:rounded-[var(--radius)] file:border-0 file:bg-primary-light file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-hover"
          />
        </div>
        <span className="text-xs text-muted">PDF, DOC o DOCX · máx. 5 MB</span>
      </div>

      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      <Button
        type="submit"
        disabled={pending}
        style={accentStyle(accentColor)}
        className="hover:brightness-90"
      >
        {pending ? "Enviando…" : "Enviar postulación"}
      </Button>
    </form>
  );
}
