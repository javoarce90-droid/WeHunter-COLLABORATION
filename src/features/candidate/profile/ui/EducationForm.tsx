"use client";

import { useActionState } from "react";
import {
  agregarEducacionAction,
  editarEducacionAction,
  type ResumeActionState,
} from "../resume-actions";
import type { CandidateEducation } from "@/db/schema";

type ActionFn = (prev: ResumeActionState, formData: FormData) => Promise<ResumeActionState>;

interface Props {
  education?: CandidateEducation;
  onDone: () => void;
  actions?: { agregar: ActionFn; editar: ActionFn };
  hiddenFields?: Record<string, string>;
}

export function EducationForm({
  education,
  onDone,
  actions = { agregar: agregarEducacionAction, editar: editarEducacionAction },
  hiddenFields,
}: Props) {
  const isEdit = Boolean(education);

  const [state, dispatch, isPending] = useActionState<ResumeActionState, FormData>(
    async (prev, formData) => {
      const result = isEdit ? await actions.editar(prev, formData) : await actions.agregar(prev, formData);
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
      {hiddenFields &&
        Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      {isEdit && <input type="hidden" name="id" value={education!.id} />}

      <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
        Institución
        <input
          type="text"
          name="institution"
          required
          defaultValue={education?.institution ?? ""}
          className="rounded-[var(--radius)] border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
        Título o carrera
        <input
          type="text"
          name="degree"
          required
          defaultValue={education?.degree ?? ""}
          className="rounded-[var(--radius)] border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
        Área de estudio
        <input
          type="text"
          name="fieldOfStudy"
          defaultValue={education?.fieldOfStudy ?? ""}
          className="rounded-[var(--radius)] border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-primary"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
          Fecha inicio
          <input
            type="date"
            name="startDate"
            defaultValue={education?.startDate ?? ""}
            className="rounded-[var(--radius)] border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
          Fecha fin
          <input
            type="date"
            name="endDate"
            defaultValue={education?.endDate ?? ""}
            className="rounded-[var(--radius)] border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-primary"
          />
        </label>
      </div>

      <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
        Descripción
        <textarea
          name="description"
          rows={2}
          defaultValue={education?.description ?? ""}
          className="resize-none rounded-[var(--radius)] border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-primary"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
          Calificación
          <input
            type="text"
            name="grade"
            defaultValue={education?.grade ?? ""}
            className="rounded-[var(--radius)] border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-0.5 text-[11px] font-medium text-muted">
          Actividades
          <input
            type="text"
            name="activities"
            defaultValue={education?.activities ?? ""}
            className="rounded-[var(--radius)] border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none focus:border-primary"
          />
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
          {isPending ? "Guardando…" : isEdit ? "Guardar" : "Añadir educación"}
        </button>
      </div>
    </form>
  );
}
