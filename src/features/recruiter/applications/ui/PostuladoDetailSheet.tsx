"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Menu, MenuItem, MenuLabel } from "@/components/ui/menu";
import { Spinner } from "@/components/ui/spinner";
import { CANDIDATE_SOURCE_LABELS } from "@/features/recruiter/candidates/ui/source-meta";
import type { CandidateSource } from "@/features/recruiter/candidates/domain/candidate-details";
import type { CriteriosEvaluados } from "@/features/recruiter/screening/domain/evaluar-criterios";
import { NoteTimeline } from "@/features/recruiter/notes/ui/NoteTimeline";
import type { TimelineNote } from "@/features/recruiter/notes/data/notes.queries";
import type { LanguageLevel } from "@/db/schema";
import type { JobStage } from "@/features/recruiter/pipeline-stages/schema";
import { isClosingKind } from "@/features/recruiter/pipeline-stages/schema";
import { STAGE_LABELS } from "../schema";
import type { PostuladoRow, StageHistoryEvent } from "../data/applications.queries";
import { getFichaCandidatoAction, type FichaCandidatoData } from "../actions";
import { CriteriosChip } from "./CriteriosChip";
import { MatchCell } from "./MatchCell";
import { StageHistoryTimeline } from "./StageHistoryTimeline";

export type ScreeningAnswerLine = {
  questionId: string;
  label: string;
  value: string;
};

type Props = {
  jobId: string;
  postulado: PostuladoRow | null;
  criterios: CriteriosEvaluados | null;
  screening: ScreeningAnswerLine[];
  notes: TimelineNote[];
  stageEvents: StageHistoryEvent[];
  onClose: () => void;
  onPasarAlPipeline: (row: PostuladoRow) => void;
  onGuardarEnPool: (row: PostuladoRow) => void;
  onDescartar: (row: PostuladoRow) => void;
  onOpenCopiloto: (row: PostuladoRow) => void;
  /** Solo desde Pipeline: habilita el desplegable "Cambiar etapa". Ausente en Postulados. */
  stageProps?: {
    stages: JobStage[];
    currentStageId: string | null;
    onMoveStage: (applicationId: string, toStageId: string) => void;
  };
};

type Tab = "perfil" | "notas" | "postulaciones" | "historial";

const LANGUAGE_LEVEL_LABELS: Record<LanguageLevel, string> = {
  basico: "Básico",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
  nativo: "Nativo",
};

const monthYearFmt = new Intl.DateTimeFormat("es-AR", { month: "short", year: "numeric" });

function formatRange(startDate: string | null, endDate: string | null): string {
  const start = startDate ? monthYearFmt.format(new Date(startDate)) : "—";
  const end = endDate ? monthYearFmt.format(new Date(endDate)) : "Actualidad";
  return `${start} – ${end}`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-bold uppercase tracking-wide text-label">{title}</h3>
      {children}
    </section>
  );
}

/**
 * Ficha de un postulado, con las mismas 4 pestañas del prototipo (Perfil / Notas /
 * Postulaciones / Historial). Notas e historial de etapa ya llegan precargados por job
 * (una sola query para toda la bandeja, ver postulados/page.tsx); el currículum y las
 * otras búsquedas del candidato son más pesados y se piden recién al abrir la ficha
 * (database.md #6/#7 — la mayoría de las filas nunca se abren).
 *
 * Sheet lateral, no modal: mantiene la lista visible detrás para poder seguir triando.
 */
export function PostuladoDetailSheet({
  jobId,
  postulado,
  criterios,
  screening,
  notes,
  stageEvents,
  onClose,
  onPasarAlPipeline,
  onGuardarEnPool,
  onDescartar,
  onOpenCopiloto,
  stageProps,
}: Props) {
  const [tab, setTab] = useState<Tab>("perfil");
  const [ficha, setFicha] = useState<FichaCandidatoData | null>(null);
  const [loadingFicha, startLoadFicha] = useTransition();
  const candidateId = postulado?.candidate.id ?? null;

  // `tab`/`ficha` arrancan limpios en cada apertura porque PostuladosTable le da a este
  // componente un `key` distinto por candidato (remount, no reset manual — evita el
  // cascading-render que marca react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!candidateId) return;
    startLoadFicha(async () => {
      const res = await getFichaCandidatoAction(candidateId);
      if (res.ok) setFicha(res.data);
    });
  }, [candidateId]);

  if (!postulado) return null;

  const row = postulado;
  const { candidate } = row;
  const enPipeline = row.pipelineEnteredAt != null;
  const descartado = row.stage === "rejected";
  const cumplePorPregunta = new Map(
    (criterios?.detalle ?? []).map((d) => [d.questionId, d.cumple]),
  );

  const tabs: { key: Tab; label: string }[] = [
    { key: "perfil", label: "Perfil" },
    { key: "notas", label: notes.length ? `Notas (${notes.length})` : "Notas" },
    { key: "postulaciones", label: "Postulaciones" },
    { key: "historial", label: "Historial" },
  ];

  // Solo cuando viene desde Pipeline (stageProps): arma el desplegable "Cambiar etapa".
  const currentStage = stageProps?.currentStageId
    ? stageProps.stages.find((s) => s.id === stageProps.currentStageId)
    : undefined;
  const stageTerminal = currentStage ? isClosingKind(currentStage.kind) : false;

  return (
    <Dialog
      open
      onClose={onClose}
      side="right"
      className="max-w-md"
      header={
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar name={candidate.fullName} />
          <div className="min-w-0">
            <p className="truncate font-display text-base font-bold text-text">
              {candidate.fullName}
            </p>
            <Link
              href={`/candidates/${candidate.id}`}
              className="text-xs font-medium text-primary hover:text-primary-hover"
            >
              Ver ficha completa →
            </Link>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2">
          {descartado ? (
            <Badge variant="rejected">Descartado</Badge>
          ) : enPipeline ? (
            <Badge variant={row.stage}>{STAGE_LABELS[row.stage]}</Badge>
          ) : (
            <Badge variant="new">Pendiente de revisión</Badge>
          )}
          <Badge variant={row.selfApplied ? "blue" : "primary"}>
            {row.selfApplied ? "Auto-postulado" : "Del pool"}
          </Badge>
          {criterios && criterios.total > 0 && <CriteriosChip criterios={criterios} />}
        </div>

        {stageProps && (
          <section className="flex flex-col gap-1.5">
            {stageTerminal ? (
              <p className="rounded-[var(--radius)] bg-bg px-3 py-2 text-xs text-muted">
                Etapa terminal: este candidato ya está{" "}
                {(currentStage?.name ?? STAGE_LABELS[row.stage]).toLowerCase()}.
              </p>
            ) : (
              <Menu
                align="start"
                trigger={
                  <button
                    type="button"
                    className="inline-flex w-fit items-center gap-1.5 rounded-[var(--radius)] border border-border px-2.5 py-1.5 text-xs font-semibold text-text transition-colors hover:border-primary hover:text-primary"
                  >
                    Cambiar etapa
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="m2.5 4.5 3.5 3 3.5-3" />
                    </svg>
                  </button>
                }
              >
                <MenuLabel>Mover a</MenuLabel>
                {stageProps.stages
                  .filter((s) => s.kind !== "inbox" && s.id !== stageProps.currentStageId)
                  .sort((a, b) => a.position - b.position)
                  .map((s) => (
                    <MenuItem
                      key={s.id}
                      destructive={s.kind === "rejected"}
                      onClick={() => stageProps.onMoveStage(row.id, s.id)}
                    >
                      {s.name}
                    </MenuItem>
                  ))}
              </Menu>
            )}
          </section>
        )}

        {row.aiScore != null && (
          <div className="flex items-center gap-2">
            <MatchCell
              score={row.aiScore}
              summary={row.aiSummary}
              size={36}
              onOpenCopiloto={() => onOpenCopiloto(row)}
            />
            <button
              type="button"
              onClick={() => onOpenCopiloto(row)}
              className="rounded-sm text-xs font-semibold text-primary outline-none hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              Copiloto IA →
            </button>
          </div>
        )}

        <nav
          aria-label="Secciones de la postulación"
          className="-mb-1 flex gap-1 overflow-x-auto border-b border-border"
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-current={tab === t.key ? "page" : undefined}
              className={[
                "relative whitespace-nowrap px-2.5 py-2 text-sm font-semibold transition-colors",
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
              <dl className="flex flex-col gap-1.5 text-sm">
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-muted">Email</dt>
                  <dd className="min-w-0 truncate text-text">
                    {ficha?.candidate.email ?? candidate.email ?? "—"}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-muted">Teléfono</dt>
                  <dd className="text-text">{ficha?.candidate.phone ?? candidate.phone ?? "—"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-muted">Ubicación</dt>
                  <dd className="text-text">{ficha?.candidate.location ?? "—"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-muted">Fuente</dt>
                  <dd className="text-text">
                    {candidate.source
                      ? (CANDIDATE_SOURCE_LABELS[candidate.source as CandidateSource] ??
                        candidate.source)
                      : "—"}
                  </dd>
                </div>
              </dl>
              <div className="mt-2 flex flex-wrap gap-2">
                {(ficha?.candidate.cvUrl ?? candidate.cvUrl) && (
                  <a
                    href={`/candidates/${candidate.id}/cv`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-fit items-center gap-1.5 rounded-[var(--radius)] border border-border px-3 py-1.5 text-sm font-semibold text-text outline-none transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  >
                    Ver CV
                  </a>
                )}
                {ficha?.candidate.linkedinUrl && (
                  <a
                    href={ficha.candidate.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-fit items-center gap-1.5 rounded-[var(--radius)] border border-border px-3 py-1.5 text-sm font-semibold text-text outline-none transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                  >
                    LinkedIn
                  </a>
                )}
              </div>
            </Section>

            {loadingFicha && !ficha ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted">
                <Spinner /> Cargando perfil…
              </div>
            ) : (
              ficha && (
                <>
                  {ficha.candidate.summary && (
                    <Section title="Resumen">
                      <p className="text-sm leading-relaxed text-text/80">
                        {ficha.candidate.summary}
                      </p>
                    </Section>
                  )}

                  {ficha.resume.experiences.length > 0 && (
                    <Section title="Experiencia laboral">
                      <ul className="flex flex-col gap-2.5">
                        {ficha.resume.experiences.map((exp) => (
                          <li key={exp.id} className="border-b border-border pb-2.5 last:border-0">
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

                  {ficha.resume.education.length > 0 && (
                    <Section title="Educación">
                      <ul className="flex flex-col gap-2">
                        {ficha.resume.education.map((ed) => (
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

                  {ficha.candidate.skills && ficha.candidate.skills.length > 0 && (
                    <Section title="Skills">
                      <div className="flex flex-wrap gap-1.5">
                        {ficha.candidate.skills.map((skill) => (
                          <span
                            key={skill}
                            className="rounded-full bg-primary-light px-2.5 py-1 text-xs font-semibold text-primary-hover"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </Section>
                  )}

                  {ficha.resume.languages.length > 0 && (
                    <Section title="Idiomas">
                      <dl className="flex flex-col gap-1">
                        {ficha.resume.languages.map((lang) => (
                          <div key={lang.id} className="flex justify-between gap-2 text-sm">
                            <dt className="text-text">{lang.language}</dt>
                            <dd className="text-muted">{LANGUAGE_LEVEL_LABELS[lang.level]}</dd>
                          </div>
                        ))}
                      </dl>
                    </Section>
                  )}
                </>
              )
            )}

            {row.coverNote && (
              <Section title="Mensaje del candidato">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-text/80">
                  {row.coverNote}
                </p>
              </Section>
            )}

            {screening.length > 0 && (
              <Section title="Respuestas de screening">
                <ul className="flex flex-col gap-3">
                  {screening.map((a) => {
                    const esCriterio = cumplePorPregunta.has(a.questionId);
                    const cumple = cumplePorPregunta.get(a.questionId);
                    return (
                      <li key={a.questionId} className="flex gap-2">
                        {esCriterio && (
                          <span
                            aria-label={cumple ? "Criterio cumplido" : "Criterio no cumplido"}
                            className={`mt-0.5 shrink-0 text-sm font-bold ${
                              cumple ? "text-success" : "text-danger"
                            }`}
                          >
                            {cumple ? "✓" : "✗"}
                          </span>
                        )}
                        <div className={esCriterio ? "min-w-0" : "min-w-0 pl-[1.125rem]"}>
                          <p className="text-xs font-semibold text-muted">{a.label}</p>
                          <p className="text-sm text-text">{a.value}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Section>
            )}
          </div>
        )}

        {tab === "notas" && <NoteTimeline applicationId={row.id} jobId={jobId} notes={notes} />}

        {tab === "postulaciones" && (
          <div className="flex flex-col gap-3">
            {loadingFicha && !ficha ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted">
                <Spinner /> Cargando…
              </div>
            ) : (
              <>
                <ul className="flex flex-col divide-y divide-border">
                  {(ficha?.otherApplications ?? []).map((app) => (
                    <li key={app.id} className="flex items-center justify-between gap-2 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text">
                          {app.jobTitle}
                          {app.jobId === jobId && (
                            <span className="ml-1.5 text-xs font-normal text-muted">(esta búsqueda)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted">
                          {app.aiScore != null ? `Match ${app.aiScore}%` : "Sin analizar todavía"}
                        </p>
                      </div>
                      <Badge variant={app.stage}>{STAGE_LABELS[app.stage]}</Badge>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted">
                  La misma persona puede estar en varias búsquedas. Esta es su huella en el
                  workspace.
                </p>
              </>
            )}
          </div>
        )}

        {tab === "historial" && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-label">
                Movimientos de etapa
              </span>
              <Link
                href={`/candidates/${candidate.id}/historial`}
                className="text-xs font-medium text-primary hover:text-primary-hover"
              >
                Ver historial completo →
              </Link>
            </div>
            <StageHistoryTimeline events={stageEvents} />
          </div>
        )}

        <footer className="flex flex-wrap gap-2 border-t border-border pt-4">
          {!enPipeline && !descartado && (
            <Button variant="primary" size="sm" onClick={() => onPasarAlPipeline(row)}>
              Pasar al pipeline
            </Button>
          )}
          {!descartado && (
            <>
              {candidate.savedToPool ? (
                <Button variant="secondary" size="sm" disabled title="Ya es parte de tu pool de candidatos">
                  Ya es parte de tu pool
                </Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => onGuardarEnPool(row)}>
                  Guardar en Talent Pool
                </Button>
              )}
              <Button variant="destructive" size="sm" onClick={() => onDescartar(row)}>
                Descartar
              </Button>
            </>
          )}
        </footer>
      </div>
    </Dialog>
  );
}
