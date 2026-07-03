"use client";

import { useActionState, useState } from "react";
import { eliminarEducacionAction, type ResumeActionState } from "../resume-actions";
import type { CandidateEducation } from "@/db/schema";
import { EducationForm } from "./EducationForm";

type ActionFn = (prev: ResumeActionState, formData: FormData) => Promise<ResumeActionState>;

const dateFormatter = new Intl.DateTimeFormat("es-AR", { month: "short", year: "numeric" });

function formatRange(startDate: string | null, endDate: string | null): string {
  if (!startDate && !endDate) return "";
  const start = startDate ? dateFormatter.format(new Date(startDate)) : "—";
  const end = endDate ? dateFormatter.format(new Date(endDate)) : "Actualidad";
  return `${start} – ${end}`;
}

interface Props {
  education: CandidateEducation[];
  actions?: { agregar: ActionFn; editar: ActionFn; eliminar: ActionFn };
  hiddenFields?: Record<string, string>;
}

export function EducationSection({ education, actions, hiddenFields }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const formActions = actions ? { agregar: actions.agregar, editar: actions.editar } : undefined;

  return (
    <div className="flex flex-col gap-3 bg-surface border border-border p-6 rounded-[var(--radius)] shadow-[var(--shadow)]">
      <h3 className="text-base font-bold font-display text-text">Educación</h3>

      {education.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {education.map((edu) =>
            editing === edu.id ? (
              <li key={edu.id}>
                <EducationForm
                  education={edu}
                  onDone={() => setEditing(null)}
                  actions={formActions}
                  hiddenFields={hiddenFields}
                />
              </li>
            ) : (
              <li
                key={edu.id}
                className="rounded-[var(--radius)] border border-border/60 bg-bg/40 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-text">{edu.degree}</p>
                    <p className="text-xs text-muted">
                      {edu.institution}
                      {edu.fieldOfStudy ? ` · ${edu.fieldOfStudy}` : ""}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted shrink-0">
                    {formatRange(edu.startDate, edu.endDate)}
                  </span>
                </div>
                {edu.description && (
                  <p className="mt-2 text-sm text-text/80 leading-relaxed">{edu.description}</p>
                )}
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditing(edu.id)}
                    className="text-xs font-semibold text-muted hover:text-primary"
                  >
                    Editar
                  </button>
                  <DeleteButton
                    id={edu.id}
                    action={actions?.eliminar ?? eliminarEducacionAction}
                    hiddenFields={hiddenFields}
                  />
                </div>
              </li>
            ),
          )}
        </ul>
      ) : (
        editing !== "new" && <p className="text-sm text-muted">Sin datos</p>
      )}

      {editing === "new" ? (
        <EducationForm onDone={() => setEditing(null)} actions={formActions} hiddenFields={hiddenFields} />
      ) : (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="w-full rounded-[var(--radius)] border border-dashed border-primary/25 px-3 py-2 text-left text-xs italic text-muted transition-colors hover:border-primary/50 hover:text-primary"
        >
          + Añadir educación
        </button>
      )}
    </div>
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
    <form action={dispatch} className="inline">
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
