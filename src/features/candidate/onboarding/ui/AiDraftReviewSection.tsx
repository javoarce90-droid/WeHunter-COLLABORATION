"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { EMPLOYMENT_LABELS, MODALITY_LABELS } from "@/features/recruiter/jobs/ui/field-meta";
import type { DraftWorkExperience, DraftEducation, DraftCertification } from "@/lib/ai";

interface AiDraftReviewSectionProps {
  workExperiences: DraftWorkExperience[];
  education: DraftEducation[];
  certifications: DraftCertification[];
  linkedinFetchStatus?: "ok" | "low_signal" | "failed";
  /** true si Gemini falló al leer el CV y se cayó a un borrador placeholder. */
  extractionFailed?: boolean;
}

const dateFormatter = new Intl.DateTimeFormat("es-AR", { month: "short", year: "numeric" });

function formatRange(startDate: string | null, endDate: string | null): string {
  const start = startDate ? dateFormatter.format(new Date(startDate)) : "—";
  const end = endDate ? dateFormatter.format(new Date(endDate)) : "Actualidad";
  return `${start} – ${end}`;
}

/**
 * Preview de lo que la IA extrajo del CV/LinkedIn: solo incluir/excluir por ítem, sin edición
 * campo a campo (el ajuste fino se hace después en /c/profile, con los formularios que ya
 * existen). Cada grupo manda su propio input hidden con el JSON de los ítems incluidos.
 */
export function AiDraftReviewSection({
  workExperiences,
  education,
  certifications,
  linkedinFetchStatus,
  extractionFailed,
}: AiDraftReviewSectionProps) {
  const [excludedExp, setExcludedExp] = useState<Set<number>>(new Set());
  const [excludedEdu, setExcludedEdu] = useState<Set<number>>(new Set());
  const [excludedCert, setExcludedCert] = useState<Set<number>>(new Set());

  const toggle = (set: Set<number>, setSet: (s: Set<number>) => void, i: number) => {
    const next = new Set(set);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSet(next);
  };

  const hasAnything = workExperiences.length > 0 || education.length > 0 || certifications.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {extractionFailed && (
        <p className="text-xs font-medium text-danger bg-danger/5 p-3 rounded-[var(--radius)] border border-danger/10">
          No pudimos leer tu CV automáticamente — completá los datos a mano.
        </p>
      )}
      {linkedinFetchStatus === "failed" && (
        <p className="text-xs font-medium text-danger bg-danger/5 p-3 rounded-[var(--radius)] border border-danger/10">
          No pudimos leer tu perfil de LinkedIn automáticamente — completá lo que falte a mano o subí tu CV.
        </p>
      )}
      {linkedinFetchStatus === "low_signal" && (
        <p className="text-xs font-medium text-warning bg-warning/5 p-3 rounded-[var(--radius)] border border-warning/10">
          Tu perfil de LinkedIn no devolvió mucha información; revisá bien los campos.
        </p>
      )}

      <input
        type="hidden"
        name="workExperiences"
        value={JSON.stringify(workExperiences.filter((_, i) => !excludedExp.has(i)))}
      />
      <input
        type="hidden"
        name="education"
        value={JSON.stringify(education.filter((_, i) => !excludedEdu.has(i)))}
      />
      <input
        type="hidden"
        name="certifications"
        value={JSON.stringify(certifications.filter((_, i) => !excludedCert.has(i)))}
      />

      {hasAnything && (
        <p className="text-xs text-muted -mb-1">
          Desmarcá lo que no quieras guardar. Podés ajustar el detalle de cada ítem después desde tu perfil.
        </p>
      )}

      {workExperiences.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold text-text/80 uppercase tracking-wider">Experiencia detectada</h3>
          <ul className="flex flex-col gap-2">
            {workExperiences.map((exp, i) => (
              <li
                key={i}
                className={[
                  "rounded-[var(--radius)] border border-border/60 bg-bg/40 px-4 py-3 flex gap-3 transition-opacity",
                  excludedExp.has(i) ? "opacity-50" : "",
                ].join(" ")}
              >
                <Checkbox
                  checked={!excludedExp.has(i)}
                  onChange={() => toggle(excludedExp, setExcludedExp, i)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-text">{exp.position}</p>
                      <p className="text-xs text-muted">{exp.company}</p>
                    </div>
                    <span className="text-[11px] text-muted shrink-0">{formatRange(exp.startDate, exp.endDate)}</span>
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
                  {exp.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {exp.skills.map((skill) => (
                        <Badge key={skill} variant="muted" className="text-[10px] px-2 py-0.5 rounded-md font-semibold">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {education.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold text-text/80 uppercase tracking-wider">Educación detectada</h3>
          <ul className="flex flex-col gap-2">
            {education.map((edu, i) => (
              <li
                key={i}
                className={[
                  "rounded-[var(--radius)] border border-border/60 bg-bg/40 px-4 py-3 flex gap-3 transition-opacity",
                  excludedEdu.has(i) ? "opacity-50" : "",
                ].join(" ")}
              >
                <Checkbox
                  checked={!excludedEdu.has(i)}
                  onChange={() => toggle(excludedEdu, setExcludedEdu, i)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-text">{edu.degree}</p>
                      <p className="text-xs text-muted">{edu.institution}</p>
                    </div>
                    <span className="text-[11px] text-muted shrink-0">{formatRange(edu.startDate, edu.endDate)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {certifications.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold text-text/80 uppercase tracking-wider">Certificaciones detectadas</h3>
          <ul className="flex flex-col gap-2">
            {certifications.map((cert, i) => (
              <li
                key={i}
                className={[
                  "rounded-[var(--radius)] border border-border/60 bg-bg/40 px-4 py-3 flex items-center gap-3 transition-opacity",
                  excludedCert.has(i) ? "opacity-50" : "",
                ].join(" ")}
              >
                <Checkbox
                  checked={!excludedCert.has(i)}
                  onChange={() => toggle(excludedCert, setExcludedCert, i)}
                />
                <p className="text-sm font-bold text-text">{cert.name}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
