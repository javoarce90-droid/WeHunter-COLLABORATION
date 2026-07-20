"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { AiButton, SparkleIcon } from "@/components/ui/ai";
import { Button } from "@/components/ui/button";
import { Input, fieldClasses } from "@/components/ui/input";
import {
  AREA_LABELS,
  MODALITY_LABELS,
  SENIORITY_LABELS,
  EMPLOYMENT_LABELS,
} from "@/features/recruiter/jobs/ui/field-meta";
import { solicitarBusquedaAction, sugerirSolicitudAction } from "../actions";
import type { SolicitarBusquedaActionState } from "../actions";
import type { BorradorSolicitud } from "../domain/sugerir-solicitud";

// Base de campo compartida (bg-bg, foco, error) — reusa el primitivo en vez de duplicar clases.
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

export function RequisitionForm({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState<BorradorSolicitud | null>(null);
  // Los campos que llena la IA siguen siendo no-controlados: cambiar esta versión los remonta
  // con el nuevo defaultValue, sin arrastrar el resto del form a estado de React.
  const [draftVersion, setDraftVersion] = useState(0);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPending, startAi] = useTransition();
  const [state, dispatch, pending] = useActionState<SolicitarBusquedaActionState, FormData>(
    async (prev, formData) => {
      const result = await solicitarBusquedaAction(prev, formData);
      if (result.ok) {
        formRef.current?.reset();
        setDraft(null);
        setOpen(false);
      }
      return result;
    },
    {},
  );

  function sugerir() {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    const value = (name: string) => String(fd.get(name) ?? "").trim();
    setAiError(null);
    startAi(async () => {
      const res = await sugerirSolicitudAction({
        token,
        title: value("title"),
        brief: value("brief"),
        modality: value("modality") || null,
        seniority: value("seniority") || null,
        employmentType: value("employmentType") || null,
      });
      if (res.ok && res.draft) {
        setDraft(res.draft);
        setDraftVersion((v) => v + 1);
      } else {
        setAiError(res.error ?? "No se pudo generar el borrador.");
      }
    });
  }

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
        <Input
          key={`position-${draftVersion}`}
          name="position"
          label="Puesto a cubrir"
          placeholder="Analista de datos"
          defaultValue={draft?.position ?? ""}
        />

        <Field label="Motivo *">
          <select name="reason" defaultValue="new_position" required className={selectClass}>
            <option value="new_position">Puesto nuevo</option>
            <option value="backfill">Reemplazo</option>
          </select>
        </Field>

        <Field label="Área">
          <select
            key={`jobArea-${draftVersion}`}
            name="jobArea"
            defaultValue={draft?.jobArea ?? ""}
            className={selectClass}
          >
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

      <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-primary/30 bg-primary-light/20 p-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-text">
            <SparkleIcon size={16} /> Sugerir con IA
          </span>
          <p className="mt-1 text-xs text-muted">
            Contanos en una línea qué perfil necesitás y la IA completa el puesto, las skills
            y los bloques de abajo. Después revisás y ajustás lo que quieras.
          </p>
        </div>
        <Field label="¿Qué perfil necesitás?">
          <textarea
            name="brief"
            rows={2}
            maxLength={500}
            placeholder="Ej: analista de datos para el equipo de growth, sql y visualización"
            className={textareaClass}
          />
        </Field>
        {aiError && <p className="text-xs text-danger">{aiError}</p>}
        <div className="flex justify-end">
          <AiButton type="button" disabled={aiPending} onClick={sugerir}>
            {aiPending ? "Generando…" : "Sugerir con IA"}
          </AiButton>
        </div>
      </div>

      <Input
        key={`skills-${draftVersion}`}
        name="skills"
        label="Skills (separadas por coma)"
        placeholder="sql, python, power bi"
        defaultValue={draft?.skills.join(", ") ?? ""}
      />

      <Field label="Objetivos del puesto">
        <textarea
          key={`objectives-${draftVersion}`}
          name="objectives"
          maxLength={5000}
          className={textareaClass}
          defaultValue={draft?.objectives ?? ""}
        />
      </Field>

      <Field label="Requisitos">
        <textarea
          key={`requirements-${draftVersion}`}
          name="requirements"
          maxLength={5000}
          className={textareaClass}
          defaultValue={draft?.requirements ?? ""}
        />
      </Field>

      <Field label="Responsabilidades">
        <textarea
          key={`responsibilities-${draftVersion}`}
          name="responsibilities"
          maxLength={5000}
          className={textareaClass}
          defaultValue={draft?.responsibilities ?? ""}
        />
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
