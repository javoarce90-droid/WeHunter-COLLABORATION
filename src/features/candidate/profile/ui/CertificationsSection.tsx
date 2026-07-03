"use client";

import { useActionState, useState } from "react";
import {
  agregarCertificacionAction,
  eliminarCertificacionAction,
  type ResumeActionState,
} from "../resume-actions";
import type { CandidateCertification } from "@/db/schema";

type ActionFn = (prev: ResumeActionState, formData: FormData) => Promise<ResumeActionState>;

interface Props {
  certifications: CandidateCertification[];
  actions?: { agregar: ActionFn; eliminar: ActionFn };
  hiddenFields?: Record<string, string>;
}

export function CertificationsSection({ certifications, actions, hiddenFields }: Props) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-3 bg-surface border border-border p-6 rounded-[var(--radius)] shadow-[var(--shadow)]">
      <h3 className="text-base font-bold font-display text-text">Certificaciones</h3>

      {certifications.length > 0 && (
        <ul className="flex flex-col gap-2">
          {certifications.map((cert) => (
            <li
              key={cert.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border/60 bg-bg/40 px-4 py-2.5"
            >
              <div>
                <p className="text-sm font-semibold text-text">{cert.name}</p>
                {cert.url && (
                  <a
                    href={cert.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    Ver certificado
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

      {adding ? (
        <AddForm
          onDone={() => setAdding(false)}
          action={actions?.agregar ?? agregarCertificacionAction}
          hiddenFields={hiddenFields}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full rounded-[var(--radius)] border border-dashed border-primary/25 px-3 py-2 text-left text-xs italic text-muted transition-colors hover:border-primary/50 hover:text-primary"
        >
          + Añadir certificado
        </button>
      )}
    </div>
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
      className="flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-surface p-3"
    >
      {hiddenFields &&
        Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
        Nombre del certificado
        <input
          type="text"
          name="name"
          required
          className="rounded-[var(--radius)] border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-primary"
        />
      </label>
      <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
        URL del documento (opcional)
        <input
          type="url"
          name="url"
          className="rounded-[var(--radius)] border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-primary"
        />
      </label>

      {state.error && <p className="text-xs text-danger">{state.error}</p>}

      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onDone} className="text-xs font-semibold text-muted hover:text-text">
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-[var(--radius)] bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {isPending ? "Guardando…" : "Añadir certificado"}
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
        className="text-xs font-semibold text-muted hover:text-danger disabled:opacity-50"
        title={state.error ?? undefined}
      >
        {isPending ? "Eliminando…" : "Eliminar"}
      </button>
    </form>
  );
}
