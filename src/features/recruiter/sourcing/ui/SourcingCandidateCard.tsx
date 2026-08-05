"use client";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { MatchCell } from "../../applications/ui/MatchCell";

type Match = {
  score: number;
  summary: string | null;
  onOpenDetail: () => void;
};

type JobPicker = {
  jobs: { id: string; title: string }[];
  value: string;
  onChange: (jobId: string) => void;
};

type Props = {
  name: string;
  headline: string;
  location: string | null;
  skills: string[];
  linkedinUrl: string;
  snippet?: string | null;
  /** Ausente en Sourcing Manual: ese modo no calcula compatibilidad contra ninguna búsqueda. */
  match?: Match | null;
  /** Solo en Sourcing Manual: elegir a qué búsqueda postular este candidato puntual (o
   *  ninguna, y queda solo en el pool). En Sourcing con IA no aplica — la búsqueda ya está
   *  elegida para toda la tab. */
  jobPicker?: JobPicker | null;
  imported: boolean;
  importedLabel: string;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  primaryActionLoading?: boolean;
  primaryActionDisabled?: boolean;
  onOmit: () => void;
};

/** Card de candidato de sourcing, compartida entre "Sourcing con IA" y "Sourcing Manual" —
 *  antes cada tab tenía su propio layout con detalles de spacing y tratamiento de CTA
 *  distintos para el mismo tipo de objeto. */
export function SourcingCandidateCard({
  name,
  headline,
  location,
  skills,
  linkedinUrl,
  snippet,
  match,
  jobPicker,
  imported,
  importedLabel,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionLoading,
  primaryActionDisabled,
  onOmit,
}: Props) {
  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius)] border border-border bg-surface p-4 shadow-[var(--shadow)]">
      <div className="flex items-start gap-3">
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
            {skills.map((s) => (
              <span
                key={s}
                className="rounded-md border border-border/40 bg-bg px-2 py-1 text-[11px] font-medium text-text"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
        {match && (
          <MatchCell score={match.score} summary={match.summary} onOpenCopiloto={match.onOpenDetail} />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
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
        ) : (
          <>
            {jobPicker && (
              <select
                value={jobPicker.value}
                onChange={(e) => jobPicker.onChange(e.target.value)}
                aria-label={`Búsqueda a la que postular a ${name}`}
                className="rounded-[var(--radius)] border border-border bg-bg px-2 py-2 text-xs text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Solo pool (sin postular)</option>
                {jobPicker.jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
            )}
            <Button
              size="sm"
              onClick={onPrimaryAction}
              loading={primaryActionLoading}
              disabled={primaryActionDisabled}
            >
              {primaryActionLabel}
            </Button>
            <button
              type="button"
              onClick={onOmit}
              className="rounded-lg px-3 py-1 text-xs font-semibold text-muted hover:text-danger"
            >
              Omitir
            </button>
          </>
        )}
      </div>
    </div>
  );
}
