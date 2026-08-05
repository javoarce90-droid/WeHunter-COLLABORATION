"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, fieldClasses } from "@/components/ui/input";
import {
  AREA_LABELS,
  MODALITY_LABELS,
  SENIORITY_LABELS,
  EMPLOYMENT_LABELS,
} from "@/features/recruiter/jobs/ui/field-meta";
import { cargarSolicitudAction, type CargarSolicitudState } from "../actions";

const selectClass = fieldClasses();
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

export type ReviewerOption = { membershipId: string; name: string };

/** El Hiring Manager carga su propia solicitud — mismos campos que ve un Cliente externo
 *  en su portal (`RequisitionForm`), más el picker de a quién se la asigna. Sin "Sugerir con
 *  IA" en esta primera pasada: no era parte del alcance pedido. */
export function CargarSolicitudForm({ reviewers }: { reviewers: ReviewerOption[] }) {
  const [state, dispatch, pending] = useActionState<CargarSolicitudState, FormData>(
    async (prev, formData) => cargarSolicitudAction(prev, formData),
    {},
  );

  return (
    <form
      action={dispatch}
      className="flex flex-col gap-4 rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow)]"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Se la asigno a *">
          <select name="assignedToMembershipId" required defaultValue="" className={selectClass}>
            <option value="" disabled>
              Elegí un recruiter
            </option>
            {reviewers.map((r) => (
              <option key={r.membershipId} value={r.membershipId}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>

        <Input name="title" label="Título de la búsqueda *" maxLength={120} required placeholder="Data Analyst Senior" />
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

      <Input name="skills" label="Skills (separadas por coma)" placeholder="sql, python, power bi" />

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
