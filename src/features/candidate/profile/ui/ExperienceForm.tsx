"use client";

import { useActionState } from "react";
import {
  agregarExperienciaAction,
  editarExperienciaAction,
  type ResumeActionState,
} from "../resume-actions";
import { MODALITY_LABELS, EMPLOYMENT_LABELS } from "@/features/recruiter/jobs/ui/field-meta";
import type { CandidateWorkExperience } from "@/db/schema";

interface Props {
  experience?: CandidateWorkExperience;
  onDone: () => void;
}

export function ExperienceForm({ experience, onDone }: Props) {
  const isEdit = Boolean(experience);

  const [state, dispatch, isPending] = useActionState<ResumeActionState, FormData>(
    async (prev, formData) => {
      const result = isEdit
        ? await editarExperienciaAction(prev, formData)
        : await agregarExperienciaAction(prev, formData);
      if (!result.error) onDone();
      return result;
    },
    {},
  );

  return (
    <form
      action={dispatch}
      className="mt-2 flex flex-col gap-2 rounded-[var(--radius)] border border-border bg-surface p-3"
    >
      {isEdit && <input type="hidden" name="id" value={experience!.id} />}

      <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
        Empresa
        <input
          type="text"
          name="company"
          required
          defaultValue={experience?.company ?? ""}
          className="rounded-[var(--radius)] border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
        Puesto
        <input
          type="text"
          name="position"
          required
          defaultValue={experience?.position ?? ""}
          className="rounded-[var(--radius)] border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-primary"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
          Fecha inicio
          <input
            type="date"
            name="startDate"
            defaultValue={experience?.startDate ?? ""}
            className="rounded-[var(--radius)] border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
          Fecha fin
          <input
            type="date"
            name="endDate"
            defaultValue={experience?.endDate ?? ""}
            placeholder="Actualidad"
            className="rounded-[var(--radius)] border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-primary"
          />
        </label>
      </div>

      <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
        Descripción
        <textarea
          name="description"
          rows={3}
          defaultValue={experience?.description ?? ""}
          className="resize-none rounded-[var(--radius)] border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-primary"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
          Jornada
          <select
            name="employmentType"
            defaultValue={experience?.employmentType ?? ""}
            className="rounded-[var(--radius)] border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-primary"
          >
            <option value="">Sin especificar</option>
            {Object.entries(EMPLOYMENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
          Modalidad
          <select
            name="modality"
            defaultValue={experience?.modality ?? ""}
            className="rounded-[var(--radius)] border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-primary"
          >
            <option value="">Sin especificar</option>
            {Object.entries(MODALITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

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
          {isPending ? "Guardando…" : isEdit ? "Guardar" : "Añadir experiencia"}
        </button>
      </div>
    </form>
  );
}
