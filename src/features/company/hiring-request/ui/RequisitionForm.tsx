"use client";

import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AREA_LABELS,
  MODALITY_LABELS,
  SENIORITY_LABELS,
  EMPLOYMENT_LABELS,
} from "@/features/recruiter/jobs/ui/field-meta";
import { solicitarBusquedaAction } from "../actions";
import type { SolicitarBusquedaActionState } from "../actions";

const selectClass =
  "w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[rgba(123,47,219,0.2)]";
const textareaClass = `${selectClass} min-h-24 resize-y`;
const labelClass = "text-xs font-semibold text-muted";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

export function RequisitionForm({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, dispatch, pending] = useActionState<SolicitarBusquedaActionState, FormData>(
    async (prev, formData) => {
      const result = await solicitarBusquedaAction(prev, formData);
      if (result.ok) {
        formRef.current?.reset();
        setOpen(false);
      }
      return result;
    },
    {},
  );

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[60ch] text-sm text-muted">
          Contanos qué perfil necesitás y el equipo de reclutamiento lo revisa antes de
          abrir la búsqueda.
        </p>
        <Button type="button" onClick={() => setOpen(true)}>
          Solicitar una búsqueda
        </Button>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={dispatch}
      className="flex flex-col gap-4 rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow)]"
    >
      <input type="hidden" name="token" value={token} />

      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-text">Nueva solicitud</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-semibold text-muted hover:text-text"
        >
          Cancelar
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          name="title"
          label="Título de la búsqueda *"
          maxLength={33}
          required
          placeholder="Data Analyst Senior"
        />
        <Input name="position" label="Puesto a cubrir" placeholder="Analista de datos" />

        <Field label="Motivo *">
          <select name="reason" defaultValue="new_position" required className={selectClass}>
            <option value="new_position">Puesto nuevo</option>
            <option value="backfill">Reemplazo</option>
          </select>
        </Field>

        <Field label="Área">
          <select name="jobArea" defaultValue="" className={selectClass}>
            <option value="">Sin especificar</option>
            {Object.entries(AREA_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Input name="location" label="Ubicación" placeholder="Buenos Aires" />

        <Field label="Modalidad">
          <select name="modality" defaultValue="" className={selectClass}>
            <option value="">Sin especificar</option>
            {Object.entries(MODALITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Seniority">
          <select name="seniority" defaultValue="" className={selectClass}>
            <option value="">Sin especificar</option>
            {Object.entries(SENIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Tipo de contratación">
          <select name="employmentType" defaultValue="" className={selectClass}>
            <option value="">Sin especificar</option>
            {Object.entries(EMPLOYMENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Input name="budget" label="Presupuesto" placeholder="USD 3.000 – 4.000 brutos" />
        <Input name="estimatedStartDate" label="Fecha estimada de ingreso" type="date" />
      </div>

      <Input
        name="skills"
        label="Skills (separadas por coma)"
        placeholder="sql, python, power bi"
      />

      <Field label="Objetivos del puesto">
        <textarea name="objectives" maxLength={5000} className={textareaClass} />
      </Field>

      <Field label="Requisitos">
        <textarea name="requirements" maxLength={5000} className={textareaClass} />
      </Field>

      <Field label="Responsabilidades">
        <textarea name="responsibilities" maxLength={5000} className={textareaClass} />
      </Field>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando…" : "Enviar solicitud"}
        </Button>
      </div>
    </form>
  );
}
