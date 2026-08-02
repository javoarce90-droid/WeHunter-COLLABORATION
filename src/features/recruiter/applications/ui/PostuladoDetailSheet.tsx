"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { AiScore } from "@/components/ui/ai";
import { CANDIDATE_SOURCE_LABELS } from "@/features/recruiter/candidates/ui/source-meta";
import type { CandidateSource } from "@/features/recruiter/candidates/domain/candidate-details";
import type { CriteriosEvaluados } from "@/features/recruiter/screening/domain/evaluar-criterios";
import { STAGE_LABELS } from "../schema";
import type { PostuladoRow } from "../data/applications.queries";
import { CriteriosChip } from "./CriteriosChip";

export type ScreeningAnswerLine = {
  questionId: string;
  label: string;
  value: string;
};

type Props = {
  postulado: PostuladoRow | null;
  criterios: CriteriosEvaluados | null;
  screening: ScreeningAnswerLine[];
  onClose: () => void;
  onPasarAlPipeline: (row: PostuladoRow) => void;
  onContactar: (row: PostuladoRow) => void;
  onGuardarEnPool: (row: PostuladoRow) => void;
  onDescartar: (row: PostuladoRow) => void;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-bold uppercase tracking-wide text-label">{title}</h3>
      {children}
    </section>
  );
}

/**
 * Panel de revisión de un postulado: todo lo que el recruiter necesita para decidir sin
 * salir de la bandeja — CV, match de IA, lo que escribió el candidato y el detalle de los
 * criterios de preselección, con las cuatro acciones al pie.
 *
 * Sheet lateral, no modal: mantiene la lista visible detrás para poder seguir triando.
 */
export function PostuladoDetailSheet({
  postulado,
  criterios,
  screening,
  onClose,
  onPasarAlPipeline,
  onContactar,
  onGuardarEnPool,
  onDescartar,
}: Props) {
  if (!postulado) return null;

  const row = postulado;
  const { candidate } = row;
  const enPipeline = row.pipelineEnteredAt != null;
  const descartado = row.stage === "rejected";
  const cumplePorPregunta = new Map(
    (criterios?.detalle ?? []).map((d) => [d.questionId, d.cumple]),
  );

  return (
    <Dialog open onClose={onClose} side="right" title="Postulación" className="max-w-md">
      <div className="flex flex-col gap-6">
        <header className="flex items-start gap-3">
          <Avatar name={candidate.fullName} />
          <div className="min-w-0 flex-1">
            <Link
              href={`/candidates/${candidate.id}`}
              className="block truncate font-display text-lg font-bold text-text hover:text-primary"
            >
              {candidate.fullName}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {descartado ? (
                <Badge variant="rejected">Descartado</Badge>
              ) : enPipeline ? (
                <Badge variant={row.stage}>{STAGE_LABELS[row.stage]}</Badge>
              ) : (
                <Badge variant="new">Pendiente de revisión</Badge>
              )}
              {criterios && criterios.total > 0 && <CriteriosChip criterios={criterios} />}
            </div>
          </div>
        </header>

        <Section title="Contacto">
          <dl className="flex flex-col gap-1.5 text-sm">
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-muted">Email</dt>
              <dd className="min-w-0 truncate text-text">{candidate.email ?? "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-muted">Teléfono</dt>
              <dd className="text-text">{candidate.phone ?? "—"}</dd>
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
          {candidate.cvUrl ? (
            <a
              href={`/candidates/${candidate.id}/cv`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-1.5 rounded-[var(--radius)] border border-border px-3 py-1.5 text-sm font-semibold text-text outline-none transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              Ver CV
            </a>
          ) : (
            <p className="text-sm text-muted">Sin CV cargado.</p>
          )}
        </Section>

        {row.aiScore != null && (
          <Section title="Match con la búsqueda">
            <div className="flex items-start gap-3">
              <AiScore score={row.aiScore} size={40} />
              {row.aiSummary && (
                <p className="text-sm leading-relaxed text-text/80">{row.aiSummary}</p>
              )}
            </div>
          </Section>
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

        <footer className="flex flex-wrap gap-2 border-t border-border pt-4">
          {!enPipeline && !descartado && (
            <Button variant="primary" size="sm" onClick={() => onPasarAlPipeline(row)}>
              Pasar al pipeline
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => onContactar(row)}>
            Contactar
          </Button>
          {!descartado && (
            <>
              <Button variant="secondary" size="sm" onClick={() => onGuardarEnPool(row)}>
                Guardar en Talent Pool
              </Button>
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
