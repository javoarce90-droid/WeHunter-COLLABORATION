"use client";

import { useActionState, useState } from "react";
import { eliminarExperienciaAction, type ResumeActionState } from "../resume-actions";
import { EMPLOYMENT_LABELS, MODALITY_LABELS } from "@/features/recruiter/jobs/ui/field-meta";
import type { CandidateWorkExperience } from "@/db/schema";
import { ExperienceForm } from "./ExperienceForm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type ActionFn = (prev: ResumeActionState, formData: FormData) => Promise<ResumeActionState>;

const dateFormatter = new Intl.DateTimeFormat("es-AR", { month: "short", year: "numeric" });

function formatRange(startDate: string | null, endDate: string | null): string {
  const start = startDate ? dateFormatter.format(new Date(startDate)) : "—";
  const end = endDate ? dateFormatter.format(new Date(endDate)) : "Actualidad";
  return `${start} – ${end}`;
}

interface Props {
  experiences: CandidateWorkExperience[];
  /** El recruiter reusa esta sección pasando sus propias actions + candidateId. */
  actions?: { agregar: ActionFn; editar: ActionFn; eliminar: ActionFn };
  hiddenFields?: Record<string, string>;
}

export function ExperienceSection({
  experiences,
  actions,
  hiddenFields,
}: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const formActions = actions ? { agregar: actions.agregar, editar: actions.editar } : undefined;

  return (
    <Card className="w-full border border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200 bg-surface animate-pop-in">
      <CardHeader className="p-5 border-b border-border/80 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-lg bg-primary-light/60 text-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-text font-display">Experiencia laboral</h3>
            <p className="text-[11px] text-muted">Empresas, roles y proyectos anteriores</p>
          </div>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="text-xs font-semibold text-primary hover:text-primary-hover px-3 py-1.5 rounded-md bg-primary-light/40 border border-primary/20 hover:border-primary/40 transition-all flex items-center gap-1 shrink-0"
          >
            + Añadir experiencia
          </button>
        )}
      </CardHeader>

      <CardContent className="p-5 flex flex-col gap-3">
        {experiences.length === 0 && editing !== "new" && (
          <div className="flex flex-col items-center justify-center py-6 px-4 bg-bg/40 rounded-[var(--radius)] border border-dashed border-border/70 text-center">
            <svg className="w-8 h-8 text-muted/50 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-xs font-medium text-text">No hay experiencias laborales registradas</p>
            <p className="text-[11px] text-muted mt-0.5">Sumá tus puestos anteriores para enriquecer tu perfil</p>
          </div>
        )}

        {experiences.length > 0 && (
          <ul className="flex flex-col gap-2.5">
            {experiences.map((exp) =>
              editing === exp.id ? (
                <li key={exp.id}>
                  <ExperienceForm
                    experience={exp}
                    onDone={() => setEditing(null)}
                    actions={formActions}
                    hiddenFields={hiddenFields}
                  />
                </li>
              ) : (
                <li
                  key={exp.id}
                  className="rounded-[var(--radius)] border border-border/80 bg-bg/40 hover:bg-bg/70 transition-colors p-3.5 text-xs animate-pop-in"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-text">{exp.position}</p>
                      <p className="text-xs text-muted font-medium">@ {exp.company}</p>
                    </div>
                    <span className="text-[11px] text-muted shrink-0">
                      {formatRange(exp.startDate, exp.endDate)}
                    </span>
                  </div>
                  {(exp.employmentType || exp.modality) && (
                    <p className="mt-1 text-[11px] text-muted">
                      {[
                        exp.employmentType ? EMPLOYMENT_LABELS[exp.employmentType] : null,
                        exp.modality ? MODALITY_LABELS[exp.modality] : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  {exp.description && (
                    <p className="mt-2 text-xs text-text/80 leading-relaxed">{exp.description}</p>
                  )}
                  {exp.skills && exp.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {exp.skills.map((skill) => (
                        <Badge key={skill} variant="muted" className="text-[10px] px-2 py-0.5 rounded-md font-medium">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-3 pt-2 border-t border-border/40">
                    <button
                      type="button"
                      onClick={() => setEditing(exp.id)}
                      className="text-xs font-semibold text-muted hover:text-primary transition-colors"
                    >
                      Editar
                    </button>
                    <DeleteButton
                      id={exp.id}
                      action={actions?.eliminar ?? eliminarExperienciaAction}
                      hiddenFields={hiddenFields}
                    />
                  </div>
                </li>
              ),
            )}
          </ul>
        )}

        {editing === "new" && (
          <ExperienceForm onDone={() => setEditing(null)} actions={formActions} hiddenFields={hiddenFields} />
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
