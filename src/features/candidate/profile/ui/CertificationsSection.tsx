"use client";

import { useActionState, useState } from "react";
import {
  agregarCertificacionAction,
  eliminarCertificacionAction,
  type ResumeActionState,
} from "../resume-actions";
import type { CandidateCertification } from "@/db/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ActionFn = (prev: ResumeActionState, formData: FormData) => Promise<ResumeActionState>;

interface Props {
  certifications: CandidateCertification[];
  actions?: { agregar: ActionFn; eliminar: ActionFn };
  hiddenFields?: Record<string, string>;
}

export function CertificationsSection({ certifications, actions, hiddenFields }: Props) {
  const [adding, setAdding] = useState(false);

  return (
    <Card className="w-full border border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200 bg-surface animate-pop-in [animation-delay:200ms]">
      <CardHeader className="p-5 border-b border-border/80 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-lg bg-primary-light/60 text-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-text font-display">Certificaciones</h3>
            <p className="text-[11px] text-muted">Certificados oficiales o exámenes</p>
          </div>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-xs font-semibold text-primary hover:text-primary-hover px-3 py-1.5 rounded-md bg-primary-light/40 border border-primary/20 hover:border-primary/40 transition-all flex items-center gap-1 shrink-0"
          >
            + Añadir
          </button>
        )}
      </CardHeader>

      <CardContent className="p-5 flex flex-col gap-3">
        {certifications.length === 0 && !adding && (
          <div className="flex flex-col items-center justify-center py-5 px-4 bg-bg/40 rounded-[var(--radius)] border border-dashed border-border/70 text-center">
            <p className="text-xs text-muted font-medium">Sin certificaciones registradas</p>
          </div>
        )}

        {certifications.length > 0 && (
          <ul className="flex flex-col gap-2">
            {certifications.map((cert) => (
              <li
                key={cert.id}
                className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border/80 bg-bg/40 hover:bg-bg/70 transition-colors p-3 text-xs animate-pop-in"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-text truncate">{cert.name}</p>
                  {cert.url && (
                    <a
                      href={cert.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-primary font-medium hover:underline inline-block mt-0.5"
                    >
                      Ver certificado ↗
                    </a>
                  )}
                </div>
                <DeleteButton
                  id={cert.id}
                  action={actions?.eliminar ?? eliminarCertificacionAction}
                  hiddenFields={hiddenFields}
                />
              </li>
            ))}
          </ul>
        )}

        {adding && (
          <AddForm
            onDone={() => setAdding(false)}
            action={actions?.agregar ?? agregarCertificacionAction}
            hiddenFields={hiddenFields}
          />
        )}
      </CardContent>
    </Card>
  );
}

function AddForm({
  onDone,
  action,
  hiddenFields,
}: {
  onDone: () => void;
  action: ActionFn;
  hiddenFields?: Record<string, string>;
}) {
  const [state, dispatch, isPending] = useActionState<ResumeActionState, FormData>(
    async (prev, formData) => {
      const result = await action(prev, formData);
      if (!result.error) onDone();
      return result;
    },
    {},
  );

  return (
    <form
      action={dispatch}
      className="flex flex-col gap-3 p-4 rounded-[var(--radius)] border-l-4 border-l-primary border border-primary/20 bg-primary-light/10 text-xs animate-pop-in"
    >
      {hiddenFields &&
        Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      
      <Input
        label="Nombre de la certificación"
        name="name"
        placeholder="Ej. AWS Certified Solutions Architect"
        required
      />

      <Input
        label="URL del certificado (opcional)"
        name="url"
        type="text"
        inputMode="url"
        placeholder="https://credly.com/badges/…"
      />

      {state.error && <p className="text-xs text-danger font-medium">{state.error}</p>}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onDone}
          className="px-3 py-1.5 text-xs font-semibold text-muted hover:text-text transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-[var(--radius)] hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50"
        >
          {isPending ? "Guardando…" : "Guardar certificación"}
        </button>
      </div>
    </form>
  );
}

function DeleteButton({
  id,
  action,
  hiddenFields,
}: {
  id: string;
  action: ActionFn;
  hiddenFields?: Record<string, string>;
}) {
  const [state, dispatch, isPending] = useActionState<ResumeActionState, FormData>(
    (prev, formData) => action(prev, formData),
    {},
  );

  return (
    <form action={dispatch}>
      {hiddenFields &&
        Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={isPending}
        className="text-xs font-semibold text-muted hover:text-danger disabled:opacity-50 transition-colors"
        title={state.error ?? undefined}
      >
        {isPending ? "Eliminando…" : "✕"}
      </button>
    </form>
  );
}
