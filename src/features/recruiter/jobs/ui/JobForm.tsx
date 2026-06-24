"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { generarAvisoAction, type JobFormState } from "../actions";
import { AiButton } from "@/components/ui/ai";
import { useToast } from "@/lib/toast";
import type {
  JobModality,
  JobSeniority,
  JobPriority,
  EmploymentType,
} from "../domain/job-details";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  MODALITY_LABELS,
  SENIORITY_LABELS,
  EMPLOYMENT_LABELS,
  PRIORITY_LABELS,
} from "./field-meta";

type JobAction = (prev: JobFormState, formData: FormData) => Promise<JobFormState>;

interface JobDefaults {
  title?: string;
  description?: string | null;
  posting?: string | null;
  clientId?: string | null;
  location?: string | null;
  modality?: JobModality | null;
  seniority?: JobSeniority | null;
  employmentType?: EmploymentType | null;
  priority?: JobPriority | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  skills?: string[] | null;
  deadline?: string | null;
}

interface JobFormProps {
  action: JobAction;
  submitLabel: string;
  jobId?: string;
  clients: { id: string; name: string }[];
  defaults?: JobDefaults;
}

const selectClass =
  "w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-muted">{label}</span>
      {children}
    </label>
  );
}

const initialState: JobFormState = {};

export function JobForm({ action, submitLabel, jobId, clients, defaults }: JobFormProps) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [posting, setPosting] = useState(defaults?.posting ?? "");
  const [showPreview, setShowPreview] = useState(false);
  const [generating, startGenerate] = useTransition();

  function generarAviso() {
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    const skills = String(fd.get("skills") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    startGenerate(async () => {
      const res = await generarAvisoAction({
        title: String(fd.get("title") ?? "").trim(),
        skills,
        seniority: (fd.get("seniority") as string) || null,
        location: (fd.get("location") as string) || null,
        modality: (fd.get("modality") as string) || null,
      });
      if (!res.ok || !res.posting) {
        toast({ message: res.error ?? "No se pudo generar.", variant: "danger" });
        return;
      }
      setPosting(res.posting);
      setShowPreview(false);
    });
  }

  return (
    <Card>
      <CardContent>
        <form ref={formRef} action={formAction} className="flex flex-col gap-6">
          {jobId && <input type="hidden" name="jobId" value={jobId} />}

          {/* — Datos de la búsqueda — */}
          <div className="flex flex-col gap-4">
            <Input
              label="Título de la búsqueda"
              name="title"
              type="text"
              placeholder="Ej: Backend Engineer (Node)"
              defaultValue={defaults?.title ?? ""}
              required
              autoFocus
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cliente">
                <select name="clientId" defaultValue={defaults?.clientId ?? ""} className={selectClass}>
                  <option value="">Sin cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Input
                label="Ubicación"
                name="location"
                type="text"
                placeholder="Ej: Buenos Aires / Remoto LATAM"
                defaultValue={defaults?.location ?? ""}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Modalidad">
                <select name="modality" defaultValue={defaults?.modality ?? ""} className={selectClass}>
                  <option value="">—</option>
                  {Object.entries(MODALITY_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </Field>
              <Field label="Seniority">
                <select name="seniority" defaultValue={defaults?.seniority ?? ""} className={selectClass}>
                  <option value="">—</option>
                  {Object.entries(SENIORITY_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </Field>
              <Field label="Contratación">
                <select name="employmentType" defaultValue={defaults?.employmentType ?? ""} className={selectClass}>
                  <option value="">—</option>
                  {Object.entries(EMPLOYMENT_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </Field>
              <Field label="Prioridad">
                <select name="priority" defaultValue={defaults?.priority ?? ""} className={selectClass}>
                  <option value="">—</option>
                  {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Input label="Salario mín." name="salaryMin" type="number" min={0} placeholder="0" defaultValue={defaults?.salaryMin ?? ""} />
              <Input label="Salario máx." name="salaryMax" type="number" min={0} placeholder="0" defaultValue={defaults?.salaryMax ?? ""} />
              <Input label="Moneda" name="salaryCurrency" type="text" placeholder="USD" defaultValue={defaults?.salaryCurrency ?? ""} />
              <Input label="Deadline" name="deadline" type="date" defaultValue={defaults?.deadline ?? ""} />
            </div>

            <Input
              label="Skills (separadas por coma)"
              name="skills"
              type="text"
              placeholder="React, Node, PostgreSQL"
              defaultValue={(defaults?.skills ?? []).join(", ")}
            />
          </div>

          {/* — Brief interno — */}
          <Field label="Brief interno (no se publica)">
            <textarea
              name="description"
              rows={5}
              placeholder="Responsabilidades, requisitos, condiciones, contexto del equipo…"
              defaultValue={defaults?.description ?? ""}
              className={selectClass + " resize-y"}
            />
          </Field>

          {/* — Aviso público con preview — */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">Aviso público</span>
              <div className="flex items-center gap-3">
                <AiButton type="button" onClick={generarAviso} disabled={generating}>
                  {generating ? "Generando…" : "Generar aviso"}
                </AiButton>
                <button
                  type="button"
                  onClick={() => setShowPreview((v) => !v)}
                  className="text-xs font-semibold text-primary hover:text-primary-hover"
                >
                  {showPreview ? "Editar" : "Previsualizar"}
                </button>
              </div>
            </div>
            {showPreview ? (
              <div className="min-h-[120px] whitespace-pre-wrap rounded-[var(--radius)] border border-border bg-bg px-3 py-2.5 text-sm text-text">
                {posting.trim() || (
                  <span className="text-muted">Nada para previsualizar todavía.</span>
                )}
              </div>
            ) : (
              <textarea
                name="posting"
                rows={6}
                value={posting}
                onChange={(e) => setPosting(e.target.value)}
                placeholder="El texto que verá el candidato en el aviso…"
                className={selectClass + " resize-y"}
              />
            )}
            {/* Cuando está en preview, el textarea no se renderiza: persistimos el valor. */}
            {showPreview && <input type="hidden" name="posting" value={posting} />}
          </div>

          {state.error && <p className="text-xs text-danger">{state.error}</p>}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : submitLabel}
            </Button>
            <Link href="/jobs" className="text-sm font-semibold text-muted">
              Cancelar
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
