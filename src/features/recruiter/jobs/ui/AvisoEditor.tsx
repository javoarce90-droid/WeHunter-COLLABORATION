"use client";

import { useActionState, useState, useTransition } from "react";
import { editarAvisoBusquedaAction, generarBorradorAction, type JobFormState } from "../actions";
import type { Benefit } from "../domain/job-details";
import type { Job } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconButton } from "@/components/ui/icon-button";
import { AiButton } from "@/components/ui/ai";
import { useToast } from "@/lib/toast";
import {
  AREA_LABELS,
  MODALITY_LABELS,
  SENIORITY_LABELS,
  EMPLOYMENT_LABELS,
} from "./field-meta";
import { JobPostingContent } from "./JobPostingContent";
import { AgregarCandidatos } from "@/features/recruiter/applications/ui/AgregarCandidatos";

const REMOVE_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

function formatSalary(min: number | null, max: number | null, currency: string | null): string | null {
  if (min == null && max == null) return null;
  const cur = currency ? `${currency} ` : "";
  const fmt = (n: number) => n.toLocaleString("es-AR");
  if (min != null && max != null) return `${cur}${fmt(min)} – ${fmt(max)}`;
  return `${cur}${fmt((min ?? max) as number)}`;
}

const textareaClass =
  "w-full min-h-24 resize-y rounded-[var(--radius)] border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]";

export function AvisoEditor({
  job,
  poolCandidates,
}: {
  job: Job;
  poolCandidates: { id: string; fullName: string; email: string | null }[];
}) {
  // Avisos viejos sin estructurar (previos a estos 4 campos): se muestra el texto legacy como
  // nota de solo lectura, no se le agrega editor — es un caso de datos viejos, no una feature.
  const hasStructured =
    !!job.objectives?.trim() ||
    !!job.requirements?.trim() ||
    !!job.responsibilities?.trim() ||
    (job.benefits?.length ?? 0) > 0;
  const showLegacyPosting = !hasStructured && !!job.posting?.trim();

  const toast = useToast();
  // Valores originales — referencia fija para detectar cambios pendientes y para "Cancelar".
  const initialObjectives = job.objectives ?? "";
  const initialRequirements = job.requirements ?? "";
  const initialResponsibilities = job.responsibilities ?? "";
  const initialBenefits = job.benefits ?? [];

  const [objectives, setObjectives] = useState(initialObjectives);
  const [requirements, setRequirements] = useState(initialRequirements);
  const [responsibilities, setResponsibilities] = useState(initialResponsibilities);
  const [benefits, setBenefits] = useState<Benefit[]>(initialBenefits);
  const [aiPending, startAi] = useTransition();

  const isDirty =
    objectives !== initialObjectives ||
    requirements !== initialRequirements ||
    responsibilities !== initialResponsibilities ||
    JSON.stringify(benefits) !== JSON.stringify(initialBenefits);

  function cancelar() {
    setObjectives(initialObjectives);
    setRequirements(initialRequirements);
    setResponsibilities(initialResponsibilities);
    setBenefits(initialBenefits);
  }

  const [state, dispatch, pending] = useActionState<JobFormState, FormData>(
    async (prev, formData) => {
      const result = await editarAvisoBusquedaAction(prev, formData);
      if (!result.error) toast({ message: "Cambios guardados", variant: "success" });
      return result;
    },
    {},
  );

  function redactarConIA() {
    const brief = `${job.position || job.title}${
      job.skills?.length ? `. Skills: ${job.skills.join(", ")}` : ""
    }`;
    startAi(async () => {
      const res = await generarBorradorAction({
        name: job.title,
        brief,
        modality: job.modality,
        seniority: job.seniority,
        workDay: job.employmentType,
      });
      if (res.ok && res.draft) {
        setObjectives(res.draft.objectives);
        setRequirements(res.draft.requirements);
        setResponsibilities(res.draft.responsibilities);
        setBenefits(res.draft.benefits);
      } else {
        toast({ message: res.error ?? "No se pudo generar el borrador.", variant: "danger" });
      }
    });
  }

  function updateBenefit(i: number, patch: Partial<Benefit>) {
    setBenefits((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }
  function addBenefit() {
    setBenefits((prev) => [...prev, { name: "", description: "" }]);
  }
  function removeBenefit(i: number) {
    setBenefits((prev) => prev.filter((_, idx) => idx !== i));
  }

  const benefitsPayload = JSON.stringify(
    benefits.filter((b) => b.name.trim() || b.description.trim()),
  );

  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  // Vista previa del candidato: solo lo que está cargado (JobPostingContent/chips).
  const chips = [
    job.jobArea ? AREA_LABELS[job.jobArea] : null,
    job.location,
    job.modality ? MODALITY_LABELS[job.modality] : null,
    job.seniority ? SENIORITY_LABELS[job.seniority] : null,
    job.employmentType ? EMPLOYMENT_LABELS[job.employmentType] : null,
    job.vacancies && job.vacancies > 1 ? `${job.vacancies} vacantes` : null,
    salary,
  ].filter((c): c is string => !!c);

  // Resumen para el recruiter: SIEMPRE muestra los 6 campos (con "—" si no están cargados) —
  // a diferencia de `chips`, acá interesa ver de un vistazo qué falta completar en "Editar".
  const infoFields = [
    { label: "Área", value: job.jobArea ? AREA_LABELS[job.jobArea] : "—" },
    { label: "Modalidad", value: job.modality ? MODALITY_LABELS[job.modality] : "—" },
    { label: "Jornada", value: job.employmentType ? EMPLOYMENT_LABELS[job.employmentType] : "—" },
    { label: "Seniority", value: job.seniority ? SENIORITY_LABELS[job.seniority] : "—" },
    { label: "Salario", value: salary ?? "—" },
    { label: "Vacantes", value: job.vacancies ? String(job.vacancies) : "—" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-text">Aviso de la búsqueda</h2>
        <AgregarCandidatos
          jobId={job.id}
          poolCandidates={poolCandidates}
          redirectAfterAddTo={`/jobs/${job.id}/postulados`}
        />
      </div>

      <div className="rounded-[var(--radius)] border border-border bg-surface p-4 shadow-[var(--shadow)]">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {infoFields.map((f) => (
            <div key={f.label}>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-label">
                {f.label}
              </dt>
              <dd className="mt-0.5 text-sm text-text">{f.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-label">
            Skills
          </p>
          {job.skills?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {job.skills.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-bg px-2.5 py-0.5 text-xs font-medium text-text"
                >
                  {s}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">—</p>
          )}
        </div>
      </div>

      {showLegacyPosting && (
        <div className="rounded-[var(--radius)] border border-border bg-bg p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-label">
            Aviso anterior (sin estructurar)
          </p>
          <p className="whitespace-pre-wrap text-sm text-text/80">{job.posting}</p>
        </div>
      )}

      <form action={dispatch} className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <input type="hidden" name="jobId" value={job.id} />
        <input type="hidden" name="benefits" value={benefitsPayload} />

        <div className="flex flex-col gap-4">
          <div className="rounded-[var(--radius)] border border-border bg-surface p-4 shadow-[var(--shadow)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-text">Contenido del aviso</h3>
              <AiButton type="button" disabled={aiPending} onClick={redactarConIA}>
                {aiPending ? "Redactando…" : "Redactar con IA"}
              </AiButton>
            </div>
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">Objetivos del puesto</span>
                <textarea
                  name="objectives"
                  rows={3}
                  className={textareaClass}
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">Responsabilidades</span>
                <textarea
                  name="responsibilities"
                  rows={3}
                  className={textareaClass}
                  value={responsibilities}
                  onChange={(e) => setResponsibilities(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">Requisitos</span>
                <textarea
                  name="requirements"
                  rows={3}
                  className={textareaClass}
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="rounded-[var(--radius)] border border-border bg-surface p-4 shadow-[var(--shadow)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-text">Beneficios</h3>
              <Button type="button" variant="ghost" size="sm" onClick={addBenefit}>
                + Agregar
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
          </div>

          {state.error && <p className="text-sm text-danger">{state.error}</p>}

          <div className="flex justify-end gap-3">
            {isDirty && (
              <Button type="button" variant="ghost" onClick={cancelar} disabled={pending}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={pending || !isDirty}>
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </div>

        <div className="lg:sticky lg:top-4 rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
            <h3 className="text-sm font-bold text-text">Vista previa</h3>
            <span className="text-xs text-muted">Así lo ve el candidato</span>
          </div>
          <div className="p-6">
            <JobPostingContent
              title={job.title}
              position={job.position}
              chips={chips}
              objectives={objectives}
              responsibilities={responsibilities}
              requirements={requirements}
              benefits={benefits}
            />
          </div>
        </div>
      </form>
    </div>
  );
}
