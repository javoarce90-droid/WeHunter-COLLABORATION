"use client";

import { useActionState, useState } from "react";
import {
  agregarIdiomaAction,
  eliminarIdiomaAction,
  type ResumeActionState,
} from "../resume-actions";
import type { CandidateLanguage, LanguageLevel } from "@/db/schema";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input, fieldClasses } from "@/components/ui/input";

type ActionFn = (prev: ResumeActionState, formData: FormData) => Promise<ResumeActionState>;

const selectClass = fieldClasses();

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
    <Card className="w-full border border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200 bg-surface animate-pop-in [animation-delay:250ms]">
      <CardHeader className="p-5 border-b border-border/80 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-lg bg-primary-light/60 text-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-text font-display">Idiomas</h3>
            <p className="text-[11px] text-muted">Idiomas y nivel de dominio</p>
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
        {languages.length === 0 && !adding && (
          <div className="flex flex-col items-center justify-center py-5 px-4 bg-bg/40 rounded-[var(--radius)] border border-dashed border-border/70 text-center">
            <p className="text-xs text-muted font-medium">Sin idiomas registrados</p>
          </div>
        )}

        {languages.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {languages.map((lang) => (
              <span
                key={lang.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-light/70 text-primary-hover text-xs font-semibold border border-primary/20 animate-pop-in"
              >
                <span>{lang.language}</span>
                <span className="text-[10px] opacity-80">({LEVEL_LABELS[lang.level] ?? lang.level})</span>
                <DeleteButton
                  id={lang.id}
                  action={actions?.eliminar ?? eliminarIdiomaAction}
                  hiddenFields={hiddenFields}
                />
              </span>
            ))}
          </div>
        )}

        {adding && (
          <AddForm
            onDone={() => setAdding(false)}
            action={actions?.agregar ?? agregarIdiomaAction}
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
        label="Idioma"
        name="language"
        placeholder="Ej: Inglés"
        required
      />

      <label className="flex flex-col gap-1">
        <span className="font-semibold text-muted text-xs">Nivel de dominio</span>
        <select
          name="level"
          required
          defaultValue="intermedio"
          className={selectClass + " text-xs"}
        >
          <option value="basico">Básico</option>
          <option value="intermedio">Intermedio</option>
          <option value="avanzado">Avanzado</option>
          <option value="nativo">Nativo</option>
        </select>
      </label>

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
          {isPending ? "Guardando…" : "Guardar idioma"}
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
    <form action={dispatch} className="inline-flex items-center">
      {hiddenFields &&
        Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={isPending}
        className="hover:text-danger font-bold text-xs transition-colors ml-1"
        title={state.error ?? "Eliminar idioma"}
      >
        {isPending ? "…" : "✕"}
      </button>
    </form>
  );
}
