"use client";

import { useActionState, useState } from "react";
import { eliminarExperienciaAction, type ResumeActionState } from "../resume-actions";
import { EMPLOYMENT_LABELS, MODALITY_LABELS } from "@/features/recruiter/jobs/ui/field-meta";
import type { CandidateWorkExperience } from "@/db/schema";
import { ExperienceForm } from "./ExperienceForm";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { month: "short", year: "numeric" });

function formatRange(startDate: string | null, endDate: string | null): string {
  const start = startDate ? dateFormatter.format(new Date(startDate)) : "—";
  const end = endDate ? dateFormatter.format(new Date(endDate)) : "Actualidad";
  return `${start} – ${end}`;
}

export function ExperienceSection({ experiences }: { experiences: CandidateWorkExperience[] }) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3 bg-surface border border-border p-6 rounded-[var(--radius)] shadow-[var(--shadow)]">
      <h3 className="text-base font-bold font-display text-text">Experiencia laboral</h3>

      {experiences.length > 0 && (
        <ul className="flex flex-col gap-2">
          {experiences.map((exp) =>
            editing === exp.id ? (
              <li key={exp.id}>
                <ExperienceForm experience={exp} onDone={() => setEditing(null)} />
              </li>
            ) : (
              <li
                key={exp.id}
                className="rounded-[var(--radius)] border border-border/60 bg-bg/40 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-text">{exp.position}</p>
                    <p className="text-xs text-muted">{exp.company}</p>
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
                  <p className="mt-2 text-sm text-text/80 leading-relaxed">{exp.description}</p>
                )}
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditing(exp.id)}
                    className="text-xs font-semibold text-muted hover:text-primary"
                  >
                    Editar
                  </button>
                  <DeleteButton id={exp.id} />
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {editing === "new" ? (
        <ExperienceForm onDone={() => setEditing(null)} />
      ) : (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="w-full rounded-[var(--radius)] border border-dashed border-primary/25 px-3 py-2 text-left text-xs italic text-muted transition-colors hover:border-primary/50 hover:text-primary"
        >
          + Añadir experiencia
        </button>
      )}
    </div>
  );
}

function DeleteButton({ id }: { id: string }) {
  const [state, dispatch, isPending] = useActionState<ResumeActionState, FormData>(
    (prev, formData) => eliminarExperienciaAction(prev, formData),
    {},
  );

  return (
    <form action={dispatch} className="inline">
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
