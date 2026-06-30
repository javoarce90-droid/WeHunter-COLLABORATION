"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { generarBorradorAction, type JobFormState } from "../actions";
import { AiButton } from "@/components/ui/ai";
import { useToast } from "@/lib/toast";
import type {
  JobModality,
  JobSeniority,
  JobPriority,
  EmploymentType,
  JobArea,
  Benefit,
} from "../domain/job-details";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { JobMarkdown } from "./markdown";
import {
  MODALITY_LABELS,
  SENIORITY_LABELS,
  EMPLOYMENT_LABELS,
  PRIORITY_LABELS,
  AREA_LABELS,
} from "./field-meta";

type JobAction = (prev: JobFormState, formData: FormData) => Promise<JobFormState>;

interface JobDefaults {
  title?: string;
  position?: string | null;
  jobArea?: JobArea | null;
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
  vacancies?: number | null;
  objectives?: string | null;
  requirements?: string | null;
  responsibilities?: string | null;
  benefits?: Benefit[] | null;
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

function Section({
  title,
  hint,
  children,
  first,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  first?: boolean;
}) {
  return (
    <div className={["flex flex-col gap-4", first ? "" : "border-t border-border pt-6"].join(" ")}>
      <div>
        <h2 className="text-sm font-bold text-text">{title}</h2>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

const REMOVE_ICON = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="m4 4 8 8M12 4l-8 8" />
  </svg>
);

const DRAFT_FIELD_LABELS =
  "puesto, área, objetivos, requisitos, responsabilidades, vacantes, skills y beneficios";

const initialState: JobFormState = {};

export function JobForm({ action, submitLabel, jobId, clients, defaults }: JobFormProps) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(action, initialState);

  // Campos que la IA puede prellenar → controlados, para poder setearlos tras "Crear con IA".
  const [position, setPosition] = useState(defaults?.position ?? "");
  const [jobArea, setJobArea] = useState(defaults?.jobArea ?? "");
  const [vacancies, setVacancies] = useState(
    defaults?.vacancies != null ? String(defaults.vacancies) : "",
  );
  const [objectives, setObjectives] = useState(defaults?.objectives ?? "");
  const [requirements, setRequirements] = useState(defaults?.requirements ?? "");
  const [responsibilities, setResponsibilities] = useState(
    defaults?.responsibilities ?? "",
  );
  const [skills, setSkills] = useState((defaults?.skills ?? []).join(", "));
  const [benefits, setBenefits] = useState<Benefit[]>(defaults?.benefits ?? []);

  const [brief, setBrief] = useState("");
  const [generating, startGenerate] = useTransition();

  function generarConIa() {
    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);
    const name = String(fd.get("title") ?? "").trim();
    if (!name) {
      toast({ message: "Cargá el nombre de la búsqueda primero.", variant: "danger" });
      return;
    }
    startGenerate(async () => {
      const res = await generarBorradorAction({
        name,
        brief: brief.trim(),
        modality: (fd.get("modality") as string) || null,
        seniority: (fd.get("seniority") as string) || null,
        workDay: (fd.get("employmentType") as string) || null,
      });
      if (!res.ok || !res.draft) {
        toast({ message: res.error ?? "No se pudo generar.", variant: "danger" });
        return;
      }
      const d = res.draft;
      setPosition(d.position);
      setJobArea(d.jobArea ?? "");
      setVacancies(String(d.vacancies));
      setObjectives(d.objectives);
      setRequirements(d.requirements);
      setResponsibilities(d.responsibilities);
      setSkills(d.skills.join(", "));
      setBenefits(d.benefits);
      toast({ message: `Reemplazamos ${DRAFT_FIELD_LABELS} con el borrador de la IA. Revisalo y ajustá lo que quieras.` });
    });
  }

  function updateBenefit(i: number, patch: Partial<Benefit>) {
    setBenefits((bs) => bs.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }
  function addBenefit() {
    setBenefits((bs) => [...bs, { name: "", description: "" }]);
  }
  function removeBenefit(i: number) {
    setBenefits((bs) => bs.filter((_, idx) => idx !== i));
  }

  // Serializamos beneficios (lista dinámica) a un hidden input para que viajen en el FormData.
  const benefitsPayload = JSON.stringify(
    benefits.filter((b) => b.name.trim() || b.description.trim()),
  );

  return (
    <Card>
      <CardContent>
        <form ref={formRef} action={formAction} className="flex flex-col gap-6">
          {jobId && <input type="hidden" name="jobId" value={jobId} />}
          {/* Aviso público legacy: lo preservamos si ya existía (el aviso se arma desde los campos). */}
          {defaults?.posting != null && (
            <input type="hidden" name="posting" value={defaults.posting} />
          )}

          <Section title="Identidad de la búsqueda" first>
            <Input
              label="Nombre de la publicación"
              name="title"
              type="text"
              maxLength={33}
              placeholder="Ej: Sumate a nuestro equipo de Backend"
              defaultValue={defaults?.title ?? ""}
              required
              autoFocus
            />

            {!jobId && (
              <div className="rounded-[var(--radius)] border border-dashed border-primary/30 bg-primary-light/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text">Crear con IA</p>
                    <p className="text-xs text-muted">
                      Completá nombre, modalidad, seniority y jornada (más abajo), sumá un texto
                      mínimo y la IA arma la búsqueda. Después la revisás y editás.
                    </p>
                  </div>
                  <AiButton type="button" onClick={generarConIa} disabled={generating}>
                    {generating ? "Generando…" : "Generar con IA"}
                  </AiButton>
                </div>
                <textarea
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  rows={3}
                  placeholder="Texto mínimo: qué buscás, contexto del equipo, lo que tengas…"
                  className={selectClass + " mt-3 resize-y bg-surface"}
                />
              </div>
            )}
          </Section>

          <Section title="Clasificación">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Puesto real a cubrir"
                name="position"
                type="text"
                placeholder="Ej: Senior Backend Engineer (Node)"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
              <Field label="Área">
                <select
                  name="jobArea"
                  value={jobArea}
                  onChange={(e) => setJobArea(e.target.value)}
                  className={selectClass}
                >
                  <option value="">—</option>
                  {Object.entries(AREA_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

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
              <Field label="Jornada">
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

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Skills (separadas por coma)"
                name="skills"
                type="text"
                placeholder="React, Node, PostgreSQL"
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
              />
              <Input label="Deadline" name="deadline" type="date" defaultValue={defaults?.deadline ?? ""} />
            </div>
          </Section>

          <Section title="Compensación">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Input label="Salario mín." name="salaryMin" type="number" min={0} placeholder="0" defaultValue={defaults?.salaryMin ?? ""} />
              <Input label="Salario máx." name="salaryMax" type="number" min={0} placeholder="0" defaultValue={defaults?.salaryMax ?? ""} />
              <Input label="Moneda (ISO)" name="salaryCurrency" type="text" maxLength={3} placeholder="USD" defaultValue={defaults?.salaryCurrency ?? ""} />
              <Input
                label="Vacantes"
                name="vacancies"
                type="number"
                min={1}
                placeholder="1"
                value={vacancies}
                onChange={(e) => setVacancies(e.target.value)}
              />
            </div>
          </Section>

          <Section title="Contenido del aviso" hint="Markdown simple: ## para títulos, - para viñetas.">
            {[
              { name: "objectives", label: "Objetivos del puesto", value: objectives, set: setObjectives, placeholder: "## Objetivos\n- …" },
              { name: "requirements", label: "Requisitos", value: requirements, set: setRequirements, placeholder: "## Requisitos\n- …" },
              { name: "responsibilities", label: "Responsabilidades", value: responsibilities, set: setResponsibilities, placeholder: "## Responsabilidades\n- …" },
            ].map((f) => (
              <Field key={f.name} label={`${f.label} (Markdown)`}>
                <textarea
                  name={f.name}
                  rows={4}
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  className={selectClass + " resize-y font-mono text-xs"}
                />
                {f.value.trim() && (
                  <div className="rounded-[var(--radius)] border border-border bg-bg px-3 py-2.5">
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Vista previa
                    </p>
                    <JobMarkdown text={f.value} className="text-sm text-text" />
                  </div>
                )}
              </Field>
            ))}
          </Section>

          <Section title="Beneficios">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted">Lista de beneficios</span>
                <Button type="button" variant="ghost" size="sm" onClick={addBenefit}>
                  + Agregar beneficio
                </Button>
              </div>
              {benefits.length === 0 ? (
                <p className="text-xs text-muted">Todavía no agregaste beneficios.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {benefits.map((b, i) => (
                    <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                      <Input
                        aria-label={`Nombre del beneficio ${i + 1}`}
                        value={b.name}
                        onChange={(e) => updateBenefit(i, { name: e.target.value })}
                        placeholder="Ej: Obra social"
                        maxLength={80}
                      />
                      <Input
                        aria-label={`Descripción del beneficio ${i + 1}`}
                        value={b.description}
                        onChange={(e) => updateBenefit(i, { description: e.target.value })}
                        placeholder="Detalle del beneficio"
                        maxLength={280}
                      />
                      <IconButton
                        aria-label={`Quitar beneficio ${i + 1}${b.name ? `: ${b.name}` : ""}`}
                        variant="surface"
                        onClick={() => removeBenefit(i)}
                        className="hover:border-danger hover:text-danger"
                      >
                        {REMOVE_ICON}
                      </IconButton>
                    </div>
                  ))}
                </div>
              )}
              <input type="hidden" name="benefits" value={benefitsPayload} />
            </div>
          </Section>

          <Section title="Notas internas">
            <Field label="Brief interno (no se publica)">
              <textarea
                name="description"
                rows={4}
                placeholder="Notas privadas del equipo: contexto, condiciones, lo que no va en el aviso…"
                defaultValue={defaults?.description ?? ""}
                className={selectClass + " resize-y"}
              />
            </Field>
          </Section>

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
