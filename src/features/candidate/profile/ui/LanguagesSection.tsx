"use client";

import { useActionState, useState } from "react";
import {
  agregarIdiomaAction,
  eliminarIdiomaAction,
  type ResumeActionState,
} from "../resume-actions";
import type { CandidateLanguage, LanguageLevel } from "@/db/schema";

type ActionFn = (prev: ResumeActionState, formData: FormData) => Promise<ResumeActionState>;

const LEVEL_LABELS: Record<LanguageLevel, string> = {
  basico: "Básico",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
  nativo: "Nativo",
};

interface Props {
  languages: CandidateLanguage[];
  actions?: { agregar: ActionFn; eliminar: ActionFn };
  hiddenFields?: Record<string, string>;
}

export function LanguagesSection({ languages, actions, hiddenFields }: Props) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex flex-col gap-3 bg-surface border border-border p-6 rounded-[var(--radius)] shadow-[var(--shadow)]">
      <h3 className="text-base font-bold font-display text-text">Idiomas</h3>

      {languages.length > 0 && (
        <ul className="flex flex-col gap-2">
          {languages.map((lang) => (
            <li
              key={lang.id}
              className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-border/60 bg-bg/40 px-4 py-2.5"
            >
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-text">{lang.language}</p>
                <span className="rounded-full bg-primary-light px-2 py-0.5 text-[11px] font-semibold text-primary-hover">
                  {LEVEL_LABELS[lang.level]}
                </span>
              </div>
              <DeleteButton
                id={lang.id}
                action={actions?.eliminar ?? eliminarIdiomaAction}
                hiddenFields={hiddenFields}
              />
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <AddForm
          onDone={() => setAdding(false)}
          action={actions?.agregar ?? agregarIdiomaAction}
          hiddenFields={hiddenFields}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full rounded-[var(--radius)] border border-dashed border-primary/25 px-3 py-2 text-left text-xs italic text-muted transition-colors hover:border-primary/50 hover:text-primary"
        >
          + Añadir idioma
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
        Idioma
        <input
          type="text"
          name="language"
          required
          placeholder="Ej: Inglés"
          className="rounded-[var(--radius)] border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-primary"
        />
      </label>
      <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
        Nivel
        <select
          name="level"
          required
          defaultValue="intermedio"
          className="rounded-[var(--radius)] border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-primary"
        >
          <option value="basico">Básico</option>
          <option value="intermedio">Intermedio</option>
          <option value="avanzado">Avanzado</option>
          <option value="nativo">Nativo</option>
        </select>
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
          {isPending ? "Guardando…" : "Añadir idioma"}
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
