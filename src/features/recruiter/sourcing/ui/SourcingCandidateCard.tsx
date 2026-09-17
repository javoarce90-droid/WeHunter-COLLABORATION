"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { ChevronDown, ExternalLink } from "lucide-react";
import { MatchCell } from "../../applications/ui/MatchCell";
import type {
  ProviderCertification,
  ProviderEducation,
  ProviderExperience,
  ProviderLanguage,
} from "../domain/sourcing-provider";

type Resume = {
  experience: ProviderExperience[];
  education: ProviderEducation[];
  certifications: ProviderCertification[];
  languages: ProviderLanguage[];
};

function hasResumeContent(r: Resume | null | undefined): r is Resume {
  return !!r && (r.experience.length + r.education.length + r.certifications.length + r.languages.length) > 0;
}

/** Rango de fechas de una experiencia/educación — `endDate: null` es "actualidad" (mismo
 *  criterio que `candidate_work_experiences`), no un dato faltante. */
function dateRange(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  return `${start ?? "—"} – ${end ?? "Actualidad"}`;
}

/** Detalle completo del perfil (experiencia, educación, certificaciones, idiomas) que trae
 *  HarvestAPI — ausente en modo demo/Serper (arrays vacíos, `hasResumeContent` lo filtra).
 *  Colapsable e inline, no modal: tiene que caber igual en la tab completa de Sourcing y en
 *  el panel lateral angosto de Postulados (`SourcingIADialog`, `max-w-xl`). */
function ResumeDetail({ resume, name }: { resume: Resume; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
        {open ? "Ocultar experiencia y educación" : "Ver experiencia y educación"}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-4 text-xs">
          {resume.experience.length > 0 && (
            <section aria-label={`Experiencia de ${name}`} className="flex flex-col gap-2.5">
              <h4 className="text-[11px] font-semibold text-label">Experiencia</h4>
              {resume.experience.map((e, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <p className="font-medium text-text">
                    {e.position} <span className="font-normal text-muted">· {e.company}</span>
                  </p>
                  {dateRange(e.startDate, e.endDate) && (
                    <p className="text-muted">{dateRange(e.startDate, e.endDate)}</p>
                  )}
                  {e.description && <p className="text-muted">{e.description}</p>}
                </div>
              ))}
            </section>
          )}

          {resume.education.length > 0 && (
            <section aria-label={`Educación de ${name}`} className="flex flex-col gap-2.5">
              <h4 className="text-[11px] font-semibold text-label">Educación</h4>
              {resume.education.map((e, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <p className="font-medium text-text">
                    {e.degree}
                    {e.fieldOfStudy ? ` — ${e.fieldOfStudy}` : ""}{" "}
                    <span className="font-normal text-muted">· {e.institution}</span>
                  </p>
                  {dateRange(e.startDate, e.endDate) && (
                    <p className="text-muted">{dateRange(e.startDate, e.endDate)}</p>
                  )}
                </div>
              ))}
            </section>
          )}

          {resume.certifications.length > 0 && (
            <section aria-label={`Certificaciones de ${name}`} className="flex flex-col gap-1.5">
              <h4 className="text-[11px] font-semibold text-label">Certificaciones</h4>
              <div className="flex flex-wrap gap-1.5">
                {resume.certifications.map((c, i) =>
                  c.url ? (
                    <a
                      key={i}
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md border border-border/40 bg-bg px-2 py-1 font-medium text-text hover:text-primary"
                    >
                      {c.name}
                    </a>
                  ) : (
                    <span key={i} className="rounded-md border border-border/40 bg-bg px-2 py-1 font-medium text-text">
                      {c.name}
                    </span>
                  ),
                )}
              </div>
            </section>
          )}

          {resume.languages.length > 0 && (
            <section aria-label={`Idiomas de ${name}`} className="flex flex-col gap-1.5">
              <h4 className="text-[11px] font-semibold text-label">Idiomas</h4>
              <div className="flex flex-wrap gap-1.5">
                {resume.languages.map((l, i) => (
                  <span key={i} className="rounded-md border border-border/40 bg-bg px-2 py-1 font-medium text-text">
                    {l.language}
                    {l.level ? ` — ${l.level}` : ""}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

type Match = {
  score: number;
  summary: string | null;
  onOpenDetail: () => void;
};

type Selectable = {
  checked: boolean;
  onToggle: () => void;
};

type JobPicker = {
  jobs: { id: string; title: string }[];
  value: string;
  onChange: (jobId: string) => void;
};

const segmentClass = (active: boolean) =>
  [
    "rounded-[8px] px-3 py-2 text-xs font-semibold whitespace-nowrap outline-none transition-colors",
    "focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
    active ? "bg-surface text-primary shadow-[var(--shadow)]" : "text-muted hover:text-text",
  ].join(" ");

/** Elige el destino del candidato: solo pool, o postular a una búsqueda puntual. Dos formas
 *  según cuántas búsquedas ofrece el picker — con una sola (Sourcing con IA, la búsqueda ya
 *  está fija para toda la tab) la decisión es binaria y se ve entera de un vistazo, sin abrir
 *  nada; con varias (Sourcing Manual) no entran como toggle y se resuelve con un select, pero
 *  con el mismo label "Postular a" siempre visible — antes era un <select> sin ningún texto
 *  que lo identificara, mezclado con "Ver perfil"/"Ignorar" como si fuera un control más, y la
 *  opción de dejarlo solo en el pool pasaba desapercibida. */
function DestinationPicker({ jobPicker, name }: { jobPicker: JobPicker; name: string }) {
  const onlyJob = jobPicker.jobs.length === 1 ? jobPicker.jobs[0] : null;

  if (onlyJob) {
    const postulando = jobPicker.value === onlyJob.id;
    return (
      <div
        role="group"
        aria-label={`Destino para ${name}`}
        className="inline-flex items-center gap-1 rounded-[var(--radius)] border border-border bg-bg p-1"
      >
        <button
          type="button"
          onClick={() => jobPicker.onChange("")}
          aria-pressed={!postulando}
          className={segmentClass(!postulando)}
        >
          Solo pool
        </button>
        <button
          type="button"
          onClick={() => jobPicker.onChange(onlyJob.id)}
          aria-pressed={postulando}
          title={`Postular a ${onlyJob.title}`}
          className={segmentClass(postulando)}
        >
          <span className="inline-block max-w-40 truncate align-bottom">
            Postular a {onlyJob.title}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-[var(--radius)] border border-border bg-bg">
      <span className="flex items-center border-r border-border px-3 text-xs font-semibold text-muted">
        Postular a
      </span>
      <select
        value={jobPicker.value}
        onChange={(e) => jobPicker.onChange(e.target.value)}
        aria-label={`Búsqueda a la que postular a ${name}`}
        className="bg-transparent px-3 py-2 text-xs text-text outline-none transition-colors focus:ring-2 focus:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">Solo pool (sin postular)</option>
        {jobPicker.jobs.map((j) => (
          <option key={j.id} value={j.id}>
            {j.title}
          </option>
        ))}
      </select>
    </div>
  );
}

type Props = {
  name: string;
  headline: string;
  location: string | null;
  skills: string[];
  linkedinUrl: string;
  snippet?: string | null;
  /** Ausente en Sourcing con IA hasta que se resuelva el scoring; en Sourcing Manual, ausente
   *  hasta que el reclutador elija una búsqueda para este candidato. */
  match?: Match | null;
  /** Score en camino (Sourcing Manual, tras elegir una búsqueda): muestra un loading en vez de
   *  dejar el espacio vacío. Se ignora si ya hay `match`. */
  matchLoading?: boolean;
  /** Solo en Sourcing Manual: elegir a qué búsqueda postular este candidato puntual (o
   *  ninguna, y queda solo en el pool). En Sourcing con IA no aplica — la búsqueda ya está
   *  elegida para toda la tab. */
  jobPicker?: JobPicker | null;
  /** Solo para candidatos "pending" (ni importados ni omitidos) — habilita el checkbox de
   *  selección múltiple para acciones en lote. */
  selectable?: Selectable | null;
  /** Experiencia/educación/certificaciones/idiomas reales de HarvestAPI. Ausente o con arrays
   *  vacíos en modo demo/Serper — no se muestra el toggle en ese caso. */
  resume?: Resume | null;
  imported: boolean;
  importedLabel: string;
  /** Candidato que ya está en el Talent Pool (duplicado detectado post-perfil completo, spec
   *  "Detección de duplicado contra el Talent Pool") — consumió crédito igual que uno nuevo
   *  pero no se scorea ni es accionable acá: en vez de las acciones normales, muestra un link
   *  directo al candidato ya existente. Mutuamente excluyente con `imported`. */
  alreadyInPool?: { candidateId: string } | null;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  primaryActionLoading?: boolean;
  primaryActionDisabled?: boolean;
  onOmit: () => void;
};

/** Card de candidato de sourcing. */
export function SourcingCandidateCard({
  name,
  headline,
  location,
  skills,
  linkedinUrl,
  snippet,
  match,
  matchLoading,
  jobPicker,
  selectable,
  resume,
  imported,
  importedLabel,
  alreadyInPool,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionLoading,
  primaryActionDisabled,
  onOmit,
}: Props) {
  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius)] border border-border bg-surface p-4 shadow-[var(--shadow)]">
      <div className="flex items-start gap-3">
        {selectable && (
          <Checkbox
            checked={selectable.checked}
            onChange={selectable.onToggle}
            aria-label={`Seleccionar a ${name}`}
            className="mt-1"
          />
        )}
        <Avatar name={name} size="md" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-text">{name}</span>
            <Badge variant="muted">LinkedIn</Badge>
          </div>
          <p className="text-xs font-medium text-text">{headline}</p>
          {location && <p className="text-xs text-muted">{location}</p>}
          {snippet && (
            <p className="mt-1 line-clamp-2 rounded-[var(--radius)] border border-border/40 bg-bg/60 p-2 text-xs font-normal text-muted">
              {snippet}
            </p>
          )}
          <div className="mt-1 flex flex-wrap gap-1">
            {Array.from(new Set(skills)).map((s) => (
              <span
                key={s}
                className="rounded-md border border-border/40 bg-bg px-2 py-1 text-[11px] font-medium text-text"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
        {match ? (
          <MatchCell score={match.score} summary={match.summary} onOpenCopiloto={match.onOpenDetail} />
        ) : (
          matchLoading && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted">
              <Spinner className="text-primary" />
              Analizando…
            </div>
          )
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-xs font-medium text-text transition-colors hover:bg-surface hover:text-primary"
        >
          Ver perfil
          <ExternalLink className="h-3.5 w-3.5" />
        </a>

        {imported ? (
          <Badge variant="success">{importedLabel}</Badge>
        ) : alreadyInPool ? (
          <div className="flex items-center gap-3">
            <Badge variant="muted">Ya está en tu Talent Pool</Badge>
            <Link
              href={`/candidates/${alreadyInPool.candidateId}`}
              className="text-xs font-semibold text-primary hover:text-primary-hover"
            >
              Ver candidato
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {jobPicker && <DestinationPicker jobPicker={jobPicker} name={name} />}
              <Button
                size="sm"
                onClick={onPrimaryAction}
                loading={primaryActionLoading}
                disabled={primaryActionDisabled}
              >
                {primaryActionLabel}
              </Button>
            </div>
            <button
              type="button"
              onClick={onOmit}
              className="rounded-lg px-3 py-1 text-xs font-semibold text-muted hover:text-text"
            >
              Ignorar
            </button>
          </>
        )}
      </div>

      {hasResumeContent(resume) && <ResumeDetail resume={resume} name={name} />}
    </div>
  );
}
