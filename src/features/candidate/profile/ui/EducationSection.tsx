"use client";

import { useActionState, useState } from "react";
import { eliminarEducacionAction, type ResumeActionState } from "../resume-actions";
import type { CandidateEducation } from "@/db/schema";
import { EducationForm } from "./EducationForm";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

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
    <Card className="w-full border border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200 bg-surface animate-pop-in [animation-delay:100ms]">
      <CardHeader className="p-5 border-b border-border/80 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-lg bg-primary-light/60 text-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-text font-display">Educación</h3>
            <p className="text-[11px] text-muted">Estudios universitarios, terciarios y cursos</p>
          </div>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="text-xs font-semibold text-primary hover:text-primary-hover px-3 py-1.5 rounded-md bg-primary-light/40 border border-primary/20 hover:border-primary/40 transition-all flex items-center gap-1 shrink-0"
          >
            + Añadir estudio
          </button>
        )}
      </CardHeader>

      <CardContent className="p-5 flex flex-col gap-3">
        {education.length === 0 && editing !== "new" && (
          <div className="flex flex-col items-center justify-center py-6 px-4 bg-bg/40 rounded-[var(--radius)] border border-dashed border-border/70 text-center">
            <svg className="w-8 h-8 text-muted/50 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
            </svg>
            <p className="text-xs font-medium text-text">No hay estudios o títulos registrados</p>
            <p className="text-[11px] text-muted mt-0.5">Ingresá tu formación académica o capacitaciones</p>
          </div>
        )}

        {education.length > 0 && (
          <ul className="flex flex-col gap-2.5">
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
                  className="rounded-[var(--radius)] border border-border/80 bg-bg/40 hover:bg-bg/70 transition-colors p-3.5 text-xs animate-pop-in"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-text">{edu.degree}</p>
                      <p className="text-xs text-muted font-medium">
                        {edu.institution}
                        {edu.fieldOfStudy ? ` · ${edu.fieldOfStudy}` : ""}
                      </p>
                    </div>
                    <span className="text-[11px] text-muted shrink-0">
                      {formatRange(edu.startDate, edu.endDate)}
                    </span>
                  </div>
                  {edu.description && (
                    <p className="mt-2 text-xs text-text/80 leading-relaxed">{edu.description}</p>
                  )}
                  <div className="mt-3 flex items-center gap-3 pt-2 border-t border-border/40">
                    <button
                      type="button"
                      onClick={() => setEditing(edu.id)}
                      className="text-xs font-semibold text-muted hover:text-primary transition-colors"
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
        )}

        {editing === "new" && (
          <EducationForm onDone={() => setEditing(null)} actions={formActions} hiddenFields={hiddenFields} />
        )}
      </CardContent>
    </Card>
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
        className="text-xs font-semibold text-muted hover:text-danger disabled:opacity-50 transition-colors"
        title={state.error ?? undefined}
      >
        {isPending ? "Eliminando…" : "Eliminar"}
      </button>
    </form>
  );
}
