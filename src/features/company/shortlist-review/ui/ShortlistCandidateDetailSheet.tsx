"use client";

import { type ReactNode, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { STAGE_LABELS } from "@/features/recruiter/applications/schema";
import {
  MODE_LABELS,
  STATUS_BADGE,
  STATUS_LABELS,
  TYPE_BADGE,
  TYPE_LABELS,
} from "@/features/recruiter/interviews/schema";
import type { InterviewMode, InterviewStatus, InterviewType } from "@/features/recruiter/interviews/schema";
import type { ShortlistCandidateDetailData } from "../domain/shortlist-candidate-detail";
import { FEEDBACK_META } from "./feedback-meta";

const LANGUAGE_LEVEL_LABELS: Record<string, string> = {
  basico: "Básico",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
  nativo: "Nativo",
};

const monthYearFmt = new Intl.DateTimeFormat("es-AR", { month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function formatRange(startDate: string | null, endDate: string | null): string {
  const start = startDate ? monthYearFmt.format(new Date(startDate)) : "—";
  const end = endDate ? monthYearFmt.format(new Date(endDate)) : "Actualidad";
  return `${start} – ${end}`;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-bold uppercase tracking-wide text-label">{title}</h3>
      {children}
    </section>
  );
}

type Tab = "perfil" | "entrevistas" | "comentarios";

type Props = {
  data: ShortlistCandidateDetailData | null;
  jobTitle: string;
  onClose: () => void;
  /** Feedback (Aprobar/Rechazar/Quizás) + solicitar entrevista — Cliente/HM. Ausente para el
   *  recruiter, que ve la respuesta de solo lectura (se arma acá mismo desde `data`). */
  decisionSlot?: ReactNode;
  /** Composer del hilo de comentarios — solo el recruiter puede escribir. */
  commentComposerSlot?: ReactNode;
  /** Botón "Agendar entrevista" — solo el recruiter, cuando hay un pedido pendiente. */
  scheduleSlot?: ReactNode;
};

/**
 * Sheet de detalle de un candidato de shortlist — mismo patrón que `PostuladoDetailSheet`
 * (Pipeline/Postulados): sheet lateral con tabs, no modal centrado. Compartido por los 3
 * roles que revisan un shortlist (Cliente por token, Hiring Manager, Recruiter); cada
 * caller arma `data` desde su propia fuente y decide qué slots de acción pasar.
 */
export function ShortlistCandidateDetailSheet({
  data,
  jobTitle,
  onClose,
  decisionSlot,
  commentComposerSlot,
  scheduleSlot,
}: Props) {
  const [tab, setTab] = useState<Tab>("perfil");
  if (!data) return null;

  const feedback = data.feedbackDecision ? FEEDBACK_META[data.feedbackDecision] : null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "perfil", label: "Perfil" },
    { key: "entrevistas", label: data.interviews.length ? `Entrevistas (${data.interviews.length})` : "Entrevistas" },
    { key: "comentarios", label: data.comments.length ? `Comentarios (${data.comments.length})` : "Comentarios" },
  ];

  return (
    <Dialog
      open
      onClose={onClose}
      side="right"
      className="max-w-md"
      header={
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={data.fullName} />
          <div className="min-w-0">
            <p className="truncate font-display text-base font-bold text-text">{data.fullName}</p>
            <p className="truncate text-xs text-muted">{jobTitle}</p>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={data.stage}>{STAGE_LABELS[data.stage]}</Badge>
          {feedback && <Badge variant={feedback.variant}>{feedback.label}</Badge>}
          {data.interviewRequestedAt && <Badge variant="warning">Entrevista solicitada</Badge>}
        </div>

        {(decisionSlot || feedback || data.feedbackComment || scheduleSlot || data.interviewRequestedAt) && (
          <section className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-bg p-4">
            {decisionSlot ?? (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-label">Respuesta</p>
                {feedback ? (
                  <p className="text-sm text-text">
                    Decisión: <span className="font-semibold">{feedback.label}</span>
                  </p>
                ) : (
                  <p className="text-sm text-muted">Todavía no dejó una decisión.</p>
                )}
                {data.feedbackComment && (
                  <p className="text-sm italic text-text/80">“{data.feedbackComment}”</p>
                )}
                {data.interviewRequestedAt && data.interviewRequestedSlots && (
                  <div className="mt-1 flex flex-col gap-1">
                    <p className="text-xs font-semibold text-muted">Horarios propuestos</p>
                    <ul className="flex flex-col gap-0.5">
                      {data.interviewRequestedSlots.map((slot) => (
                        <li key={slot} className="text-sm text-text">
                          {dateTimeFmt.format(new Date(slot))}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {scheduleSlot}
          </section>
        )}

        <nav
          aria-label="Secciones del candidato"
          className="-mb-1 flex gap-1 overflow-x-auto border-b border-border"
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-current={tab === t.key ? "page" : undefined}
              className={[
                "relative whitespace-nowrap px-3 py-2 text-sm font-semibold transition-colors",
                tab === t.key ? "text-primary" : "text-muted hover:text-text",
              ].join(" ")}
            >
              {t.label}
              {tab === t.key && (
                <span className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </nav>

        {tab === "perfil" && (
          <div className="flex flex-col gap-5">
            <Section title="Contacto">
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-muted">Email</dt>
                  <dd className="min-w-0 truncate text-text">{data.email ?? "—"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-muted">Teléfono</dt>
                  <dd className="text-text">{data.phone ?? "—"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-muted">Ubicación</dt>
                  <dd className="text-text">{data.location ?? "—"}</dd>
                </div>
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.cvHref && (
                  <a
                    href={data.cvHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-fit items-center gap-2 rounded-[var(--radius)] border border-border px-3 py-2 text-sm font-semibold text-text outline-none transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  >
                    Ver CV
                  </a>
                )}
                {data.linkedinUrl && (
                  <a
                    href={data.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-fit items-center gap-2 rounded-[var(--radius)] border border-border px-3 py-2 text-sm font-semibold text-text outline-none transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  >
                    LinkedIn
                  </a>
                )}
              </div>
            </Section>

            {data.summary && (
              <Section title="Resumen">
                <p className="text-sm leading-relaxed text-text/80">{data.summary}</p>
              </Section>
            )}

            {data.experiences.length > 0 && (
              <Section title="Experiencia laboral">
                <ul className="flex flex-col gap-3">
                  {data.experiences.map((exp) => (
                    <li key={exp.id} className="border-b border-border pb-3 last:border-0">
                      <p className="text-sm font-semibold text-text">
                        {exp.position} <span className="font-normal text-muted">· {exp.company}</span>
                      </p>
                      <p className="text-xs text-muted">{formatRange(exp.startDate, exp.endDate)}</p>
                      {exp.description && (
                        <p className="mt-1 text-sm text-text/80">{exp.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {data.education.length > 0 && (
              <Section title="Educación">
                <ul className="flex flex-col gap-2">
                  {data.education.map((ed) => (
                    <li key={ed.id}>
                      <p className="text-sm font-semibold text-text">{ed.degree}</p>
                      <p className="text-xs text-muted">
                        {ed.institution}
                        {ed.fieldOfStudy ? ` · ${ed.fieldOfStudy}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {data.skills.length > 0 && (
              <Section title="Skills">
                <div className="flex flex-wrap gap-2">
                  {data.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary-hover"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {data.languages.length > 0 && (
              <Section title="Idiomas">
                <dl className="flex flex-col gap-1">
                  {data.languages.map((lang) => (
                    <div key={lang.id} className="flex justify-between gap-2 text-sm">
                      <dt className="text-text">{lang.language}</dt>
                      <dd className="text-muted">{LANGUAGE_LEVEL_LABELS[lang.level] ?? lang.level}</dd>
                    </div>
                  ))}
                </dl>
              </Section>
            )}

            {data.screening.length > 0 && (
              <Section title="Respuestas de screening">
                <ul className="flex flex-col gap-3">
                  {data.screening.map((a) => (
                    <li key={a.questionId}>
                      <p className="text-xs font-semibold text-muted">{a.label}</p>
                      <p className="text-sm text-text">{a.value}</p>
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        )}

        {tab === "entrevistas" && (
          <div className="flex flex-col gap-2">
            {data.interviews.length === 0 ? (
              <p className="text-sm text-muted">Todavía no hay entrevistas agendadas.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.interviews.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-center justify-between gap-2 rounded-[var(--radius)] border border-border px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text">
                        {dateTimeFmt.format(new Date(it.scheduledAt))}
                      </p>
                      <p className="text-xs text-muted">{MODE_LABELS[it.mode as InterviewMode] ?? it.mode}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={TYPE_BADGE[it.type as InterviewType] ?? "muted"}>
                        {TYPE_LABELS[it.type as InterviewType] ?? it.type}
                      </Badge>
                      <Badge variant={STATUS_BADGE[it.status as InterviewStatus] ?? "muted"}>
                        {STATUS_LABELS[it.status as InterviewStatus] ?? it.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "comentarios" && (
          <div className="flex flex-col gap-4">
            {data.comments.length === 0 ? (
              <p className="text-sm text-muted">Todavía no hay comentarios de Recruiting.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {data.comments.map((c) => (
                  <li key={c.id} className="rounded-[var(--radius)] border border-border px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-text">{c.authorName ?? "Recruiting"}</span>
                      <span className="text-xs text-muted">{dateTimeFmt.format(new Date(c.createdAt))}</span>
                    </div>
                    <p className="mt-1 text-sm text-text/80">{c.body}</p>
                  </li>
                ))}
              </ul>
            )}
            {commentComposerSlot}
          </div>
        )}
      </div>
    </Dialog>
  );
}
