"use client";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";
import { MatchCell } from "../../applications/ui/MatchCell";
import { MatchBreakdown, MatchHighlights } from "../../applications/ui/AiAnalysisDialog";
import type { ScoreBreakdown } from "@/lib/ai/provider";

export type CompareSubject = {
  name: string;
  headline: string;
  location: string | null;
  skills: string[];
  /** null cuando el candidato no vino de LinkedIn (ej. postulación directa por Career Site). */
  linkedinUrl: string | null;
  /** Ausente cuando todavía no hay score contra ninguna búsqueda — en Sourcing Manual, porque
   *  el reclutador no eligió una; en Postulados, porque "Analizar con IA" no corrió todavía. */
  match?: {
    score: number;
    summary: string | null;
    /** null si el score se calculó antes de que existiera el desglose por categoría, o vino
     *  de un camino que no lo guarda. */
    breakdown: ScoreBreakdown | null;
    strengths: string[];
    redFlags: string[];
  } | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  a: CompareSubject | null;
  b: CompareSubject | null;
};

/** Comparación lado a lado de hasta 2 candidatos — disparada desde la barra de selección de
 *  Sourcing (ambas tabs) y de Postulados, siempre con el mismo criterio: el botón "Comparar"
 *  solo aparece con exactamente 2 seleccionados. Genérico por diseño (`CompareSubject` no sabe
 *  de dónde viene el candidato); reusa el mismo lenguaje visual de match que ya existía en
 *  Postulados (`MatchCell`, `MatchBreakdown`, `MatchHighlights`), cero componente de score
 *  nuevo. */
export function CompareCandidatesDialog({ open, onClose, a, b }: Props) {
  if (!open || !a || !b) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      side="center"
      title={`Comparar: ${a.name} vs. ${b.name}`}
      maxWidthClassName="max-w-3xl"
    >
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <CompareColumn subject={a} />
        <CompareColumn subject={b} />
      </div>
    </Dialog>
  );
}

function CompareColumn({ subject }: { subject: CompareSubject }) {
  const { name, headline, location, skills, linkedinUrl, match } = subject;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <Avatar name={name} size="md" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{name}</span>
            {linkedinUrl && (
              <Badge variant="muted" className="shrink-0">
                LinkedIn
              </Badge>
            )}
          </div>
          <p className="text-xs font-medium text-text">{headline}</p>
          {location && <p className="text-xs text-muted">{location}</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {skills.map((s) => (
          <span
            key={s}
            className="rounded-md border border-border/40 bg-bg px-2 py-1 text-[11px] font-medium text-text"
          >
            {s}
          </span>
        ))}
      </div>

      {linkedinUrl && (
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-2 rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-xs font-medium text-text transition-colors hover:bg-surface hover:text-primary"
        >
          Ver perfil
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        {match ? (
          <>
            <MatchCell score={match.score} summary={match.summary} size={40} />
            {match.breakdown && <MatchBreakdown breakdown={match.breakdown} />}
            <MatchHighlights strengths={match.strengths} redFlags={match.redFlags} />
          </>
        ) : (
          <p className="rounded-[var(--radius)] border border-border bg-bg px-3 py-2 text-xs text-muted">
            Sin análisis de compatibilidad todavía.
          </p>
        )}
      </div>
    </div>
  );
}
