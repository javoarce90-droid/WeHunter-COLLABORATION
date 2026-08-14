"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { type JobFormState } from "../actions";
import type {
  JobModality,
  JobSeniority,
  JobPriority,
  EmploymentType,
  JobArea,
  Benefit,
} from "../domain/job-details";
import { Button } from "@/components/ui/button";
import { todayDateInputValue, isPastDateString } from "@/lib/date";
import { IconButton } from "@/components/ui/icon-button";
import { Input, fieldClasses } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScreeningBuilder } from "@/features/recruiter/screening/ui/ScreeningBuilder";
import { SkillsPillsInput } from "@/features/candidate/profile/ui/SkillsPillsInput";
import { RichMarkdownInput } from "./RichMarkdownInput";
import type { ScreeningQuestionInput } from "@/features/recruiter/screening/domain/definir-preguntas-screening";
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
  screeningQuestions?: ScreeningQuestionInput[] | null;
}

interface JobFormProps {
  action: JobAction;
  submitLabel: string;
  jobId?: string;
  clients: { id: string; name: string }[];
  assignedClientId?: string | null;
  defaults?: JobDefaults;
  cancelHref?: string;
  cancelLabel?: string;
}

export const selectClass = fieldClasses();

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-muted">{label}</span>
      {children}
    </label>
  );
}

const REMOVE_ICON = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <path d="m4 4 8 8M12 4l-8 8" />
  </svg>
);

const initialState: JobFormState = {};

const WIZARD_STEPS = [
  {
    step: 1,
    title: "Identidad y Clasificación",
    subtitle: "Nombre del aviso, cliente, posición y modalidad",
  },
  {
    step: 2,
    title: "Condiciones y Skills",
    subtitle: "Compensación, vacantes, habilidades y brief",
  },
  {
    step: 3,
    title: "Aviso y Beneficios",
    subtitle: "Markdown del aviso, propuesta y screening",
  },
];

export function JobForm({
  action,
  submitLabel,
  jobId,
  clients,
  assignedClientId,
  defaults,
  cancelHref = "/jobs",
  cancelLabel = "Cancelar",
}: JobFormProps) {
  const lockedClient = assignedClientId
    ? clients.find((c) => c.id === assignedClientId)
    : null;
  const [state, formAction, pending] = useActionState(action, initialState);

  // Paso actual del Wizard (1, 2 o 3)
  const [step, setStep] = useState<number>(1);

  // Estados controlados
  const [titleValue, setTitleValue] = useState(defaults?.title ?? "");
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
  const [benefits, setBenefits] = useState<Benefit[]>(defaults?.benefits ?? []);
  const [screeningQuestions, setScreeningQuestions] = useState<ScreeningQuestionInput[]>(
    defaults?.screeningQuestions ?? [],
  );

  function updateBenefit(i: number, patch: Partial<Benefit>) {
    setBenefits((bs) => bs.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }
  function addBenefit() {
    setBenefits((bs) => [...bs, { name: "", description: "" }]);
  }
  function removeBenefit(i: number) {
    setBenefits((bs) => bs.filter((_, idx) => idx !== i));
  }

  const benefitsPayload = JSON.stringify(
    benefits.filter((b) => b.name.trim() || b.description.trim()),
  );

  const screeningQuestionsPayload = JSON.stringify(
    screeningQuestions.filter((q) => q.label.trim()),
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      {/* Stepper Superior Interactivo */}
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {WIZARD_STEPS.map((s) => {
            const isActive = step === s.step;
            const isCompleted = step > s.step;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => {
                  if (s.step < step || (s.step > step && titleValue.trim())) {
                    setStep(s.step);
                  }
                }}
                disabled={s.step > step && !titleValue.trim()}
                className={[
                  "flex items-center gap-3 p-3 sm:p-4 rounded-xl border text-left transition-all duration-200",
                  isActive
                    ? "bg-surface border-primary shadow-[0_2px_8px_rgba(0,0,0,0.06)] ring-1 ring-primary/20"
                    : isCompleted
                      ? "bg-surface/60 border-border/80 hover:border-primary/40 hover:bg-surface cursor-pointer"
                      : "bg-surface/30 border-border/40 opacity-60 cursor-not-allowed",
                ].join(" ")}
              >
                <div
                  className={[
                    "flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors",
                    isActive
                      ? "bg-primary text-white shadow-sm"
                      : isCompleted
                        ? "bg-success/15 text-success border border-success/30"
                        : "bg-muted/15 text-muted",
                  ].join(" ")}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    s.step
                  )}
                </div>
                <div className="min-w-0 hidden sm:flex sm:flex-col">
                  <span className={["text-xs font-bold truncate font-display", isActive ? "text-text" : "text-muted"].join(" ")}>
                    {s.title}
                  </span>
                  <span className="text-[10px] text-muted truncate">{s.subtitle}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Barra de progreso sutil */}
        <div className="h-1.5 w-full bg-border/40 overflow-hidden rounded-full">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      <form action={formAction} className="flex flex-col gap-6 w-full">
        {jobId && <input type="hidden" name="jobId" value={jobId} />}
        {defaults?.posting != null && (
          <input type="hidden" name="posting" value={defaults.posting} />
        )}

        {/* ========================================================================= */}
        {/* PASO 1: Identidad y Clasificación */}
        {/* ========================================================================= */}
        <div className={step === 1 ? "flex flex-col gap-6 animate-pop-in" : "hidden"}>
          {/* Card 1: Identidad */}
          <Card className="w-full border border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.03)] bg-surface">
            <CardHeader className="p-5 border-b border-border/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-lg bg-primary-light/60 text-primary">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-text font-display">Identidad de la Búsqueda</h3>
                  <p className="text-[11px] text-muted">Nombre de la publicación, puesto a cubrir y cliente asignado</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 flex flex-col gap-4">
              <Input
                label="Nombre de la publicación *"
                name="title"
                type="text"
                maxLength={33}
                placeholder="Ej: Sumate a nuestro equipo de Backend"
                defaultValue={defaults?.title ?? ""}
                required
                autoFocus
                onChange={(e) => setTitleValue(e.target.value)}
              />

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
                    onChange={(e) => setJobArea(e.target.value as JobArea)}
                    className={selectClass}
                  >
                    <option value="">Sin área</option>
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
                  {assignedClientId ? (
                    <>
                      <select disabled value={assignedClientId} className={selectClass}>
                        <option value={assignedClientId}>
                          {lockedClient?.name ?? "Cliente asignado"}
                        </option>
                      </select>
                      <input type="hidden" name="clientId" value={assignedClientId} />
                    </>
                  ) : (
                    <select
                      name="clientId"
                      defaultValue={defaults?.clientId ?? ""}
                      className={selectClass}
                    >
                      <option value="">Sin cliente</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <Input
                  label="Ubicación"
                  name="location"
                  type="text"
                  placeholder="Ej: Buenos Aires / Remoto LATAM"
                  defaultValue={defaults?.location ?? ""}
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Clasificación y Modalidad */}
          <Card className="w-full border border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.03)] bg-surface">
            <CardHeader className="p-5 border-b border-border/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-lg bg-primary-light/60 text-primary">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-text font-display">Clasificación Operativa</h3>
                  <p className="text-[11px] text-muted">Modalidad de trabajo, experiencia y prioridad asignada</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Modalidad">
                  <select name="modality" defaultValue={defaults?.modality ?? ""} className={selectClass}>
                    <option value="">Sin modalidad</option>
                    {Object.entries(MODALITY_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Seniority">
                  <select name="seniority" defaultValue={defaults?.seniority ?? ""} className={selectClass}>
                    <option value="">Sin seniority</option>
                    {Object.entries(SENIORITY_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Jornada">
                  <select name="employmentType" defaultValue={defaults?.employmentType ?? ""} className={selectClass}>
                    <option value="">Sin jornada</option>
                    {Object.entries(EMPLOYMENT_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Prioridad">
                  <select name="priority" defaultValue={defaults?.priority ?? ""} className={selectClass}>
                    <option value="">Sin prioridad</option>
                    {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* PASO 2: Condiciones y Habilidades */}
        {/* ========================================================================= */}
        <div className={step === 2 ? "flex flex-col gap-6 animate-pop-in" : "hidden"}>
          {/* Card 1: Compensación */}
          <Card className="w-full border border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.03)] bg-surface">
            <CardHeader className="p-5 border-b border-border/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-lg bg-primary-light/60 text-primary">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-text font-display">Compensación y Fechas</h3>
                  <p className="text-[11px] text-muted">Vacantes a cubrir, presupuesto y plazo límite</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Input
                  label="Vacantes"
                  name="vacancies"
                  type="number"
                  min={1}
                  placeholder="1"
                  value={vacancies}
                  onChange={(e) => setVacancies(e.target.value)}
                />
                <Input label="Salario mín." name="salaryMin" type="number" min={0} placeholder="0" defaultValue={defaults?.salaryMin ?? ""} />
                <Input label="Salario máx." name="salaryMax" type="number" min={0} placeholder="0" defaultValue={defaults?.salaryMax ?? ""} />
                <Input label="Moneda (ISO)" name="salaryCurrency" type="text" maxLength={3} placeholder="USD" defaultValue={defaults?.salaryCurrency ?? ""} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Deadline"
                  name="deadline"
                  type="date"
                  min={isPastDateString(defaults?.deadline) ? undefined : todayDateInputValue()}
                  defaultValue={defaults?.deadline ?? ""}
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Habilidades Requeridas (SkillsPillsInput) */}
          <Card className="w-full border border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.03)] bg-surface">
            <CardHeader className="p-5 border-b border-border/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-lg bg-primary-light/60 text-primary">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-text font-display">Habilidades y Tecnologías</h3>
                  <p className="text-[11px] text-muted">Stack tecnológico y competencias requeridas</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <SkillsPillsInput
                name="skills"
                label="Skills / Tecnologías principales"
                initialSkills={defaults?.skills ?? []}
                placeholder="Escribí una habilidad y presioná Enter o coma..."
                helpText="Presioná Enter o coma para agregar cada tecnología a la lista."
              />
            </CardContent>
          </Card>

          {/* Card 3: Briefing Interno */}
          <Card className="w-full border border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.03)] bg-surface">
            <CardHeader className="p-5 border-b border-border/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-lg bg-primary-light/60 text-primary">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-text font-display">Notas Internas (Briefing)</h3>
                  <p className="text-[11px] text-muted">Información privada del equipo de reclutamiento (no visible en el aviso)</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <Textarea
                name="description"
                rows={4}
                placeholder="Notas privadas del equipo: contexto del cliente, condiciones de la contratación, lo que no debe publicarse..."
                defaultValue={defaults?.description ?? ""}
              />
            </CardContent>
          </Card>
        </div>

        {/* ========================================================================= */}
        {/* PASO 3: Contenido del Aviso y Beneficios */}
        {/* ========================================================================= */}
        <div className={step === 3 ? "flex flex-col gap-6 animate-pop-in" : "hidden"}>
          {/* Card 1: Redacción del Aviso */}
          <Card className="w-full border border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.03)] bg-surface">
            <CardHeader className="p-5 border-b border-border/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-lg bg-primary-light/60 text-primary">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-text font-display">Contenido del Aviso de Empleo</h3>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 flex flex-col gap-6">
              {[
                {
                  field: "objectives" as const,
                  label: "Objetivos del puesto",
                  value: objectives,
                  setValue: setObjectives,
                  placeholder: "Ej: 🎯 Liderar la arquitectura de microservicios...",
                },
                {
                  field: "responsibilities" as const,
                  label: "Responsabilidades",
                  value: responsibilities,
                  setValue: setResponsibilities,
                  placeholder: "Ej: 🚀 Diseñar y desarrollar APIs REST seguras...",
                },
                {
                  field: "requirements" as const,
                  label: "Requisitos",
                  value: requirements,
                  setValue: setRequirements,
                  placeholder: "Ej: 💻 4+ años de experiencia con Node.js / TypeScript...",
                },
              ].map((f) => (
                <RichMarkdownInput
                  key={f.field}
                  name={f.field}
                  label={f.label}
                  value={f.value}
                  onChange={f.setValue}
                  placeholder={f.placeholder}
                />
              ))}
            </CardContent>
          </Card>

          {/* Card 2: Beneficios */}
          <Card className="w-full border border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.03)] bg-surface">
            <CardHeader className="p-5 border-b border-border/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-lg bg-primary-light/60 text-primary">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 2h2zm0 13C10.832 19.677 9.246 18 7.5 18S4.168 19.677 3 21c1.168-1.323 2.754-3 4.5-3s3.332 1.677 4.5 3zm0 0c1.168-1.323 2.754-3 4.5-3s3.332 1.677 4.5 3" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text font-display">Beneficios y Perceptivas</h3>
                    <p className="text-[11px] text-muted">Ventajas ofrecidas por la empresa para el rol</p>
                  </div>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={addBenefit} className="text-xs font-bold">
                  + Agregar beneficio
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              {benefits.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-border/60 rounded-xl bg-bg/20">
                  <p className="text-xs text-muted">No se agregaron beneficios aún.</p>
                  <button
                    type="button"
                    onClick={addBenefit}
                    className="mt-1 text-xs font-semibold text-primary underline hover:text-primary-hover"
                  >
                    Hacé clic acá para añadir el primero
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {benefits.map((b, i) => (
                    <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto] items-start p-3 rounded-lg border border-border/60 bg-bg/30 animate-pop-in">
                      <Input
                        aria-label={`Nombre del beneficio ${i + 1}`}
                        value={b.name}
                        onChange={(e) => updateBenefit(i, { name: e.target.value })}
                        placeholder="Ej: Obra social OSDE 310"
                        maxLength={80}
                      />
                      <Input
                        aria-label={`Descripción del beneficio ${i + 1}`}
                        value={b.description}
                        onChange={(e) => updateBenefit(i, { description: e.target.value })}
                        placeholder="Detalle o alcance del beneficio"
                        maxLength={280}
                      />
                      <IconButton
                        aria-label={`Quitar beneficio ${i + 1}${b.name ? `: ${b.name}` : ""}`}
                        variant="surface"
                        onClick={() => removeBenefit(i)}
                        className="hover:border-danger hover:text-danger mt-0.5"
                      >
                        {REMOVE_ICON}
                      </IconButton>
                    </div>
                  ))}
                </div>
              )}
              <input type="hidden" name="benefits" value={benefitsPayload} />
            </CardContent>
          </Card>

          {/* Card 3: Preguntas de Screening (Solo si es edición de búsqueda existente) */}
          {jobId && (
            <Card className="w-full border border-border/80 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.03)] bg-surface">
              <CardHeader className="p-5 border-b border-border/80">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-lg bg-primary-light/60 text-primary">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text font-display">Preguntas de Screening</h3>
                    <p className="text-[11px] text-muted">Preguntas que los postulantes deberán responder al aplicar</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <ScreeningBuilder
                  questions={screeningQuestions}
                  onChange={setScreeningQuestions}
                  jobId={jobId}
                />
                <input type="hidden" name="screeningQuestions" value={screeningQuestionsPayload} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Muestra de errores si falla la action */}
        {state.error && (
          <p className="text-xs font-medium text-danger bg-danger/5 p-3.5 rounded-[var(--radius)] border border-danger/10 animate-pop-in">
            {state.error}
          </p>
        )}

        {/* ========================================================================= */}
        {/* Footer Flotante Glassmorphism */}
        {/* ========================================================================= */}
        <div className="sticky bottom-4 z-10 flex items-center justify-between bg-surface/80 backdrop-blur-md border border-border/80 shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-4 rounded-[var(--radius)] transition-all">
          <div className="flex items-center gap-3">
            <Link href={cancelHref} className="text-sm font-semibold text-muted hover:text-text transition-colors">
              {cancelLabel}
            </Link>
            {step > 1 && (
              <Button
                type="button"
                variant="secondary"
                size="default"
                onClick={() => setStep((s) => s - 1)}
                className="font-medium text-xs"
              >
                ← Anterior
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step < 3 ? (
              <>
                <Button
                  type="submit"
                  disabled={!titleValue.trim()}
                  loading={pending}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted hover:text-text hidden sm:inline-flex"
                >
                  Guardar como borrador
                </Button>
                <Button
                  type="button"
                  disabled={step === 1 && !titleValue.trim()}
                  onClick={() => {
                    if (step === 1 && !titleValue.trim()) return;
                    setStep((s) => s + 1);
                  }}
                  size="default"
                  className="font-bold px-6 shadow-sm"
                >
                  Siguiente paso →
                </Button>
              </>
            ) : (
              <Button
                type="submit"
                disabled={!titleValue.trim()}
                loading={pending}
                size="default"
                className="font-bold px-8 shadow-sm"
              >
                {pending ? "Guardando…" : submitLabel}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
