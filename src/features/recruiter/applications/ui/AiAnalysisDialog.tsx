"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { AiScore, SparkleIcon } from "@/components/ui/ai";
import {
  matchConfidence,
  matchRecommendation,
  CONFIDENCE_LABELS,
  CONFIDENCE_TONE,
  RECOMMENDATION_LABELS,
  RECOMMENDATION_DOT,
  RECOMMENDATION_TEXT,
} from "./MatchCell";
import type { ScoreBreakdown } from "@/lib/ai/provider";

/** Sujeto genérico del análisis: cualquier candidato scoreado por IA contra una búsqueda,
 *  venga de una postulación (Postulados) o de un resultado de sourcing (aún sin postular). */
export type AiAnalysisSubject = {
  name: string;
  headline?: string | null;
  score: number;
  summary: string | null;
  breakdown: ScoreBreakdown | null;
  strengths: string[];
  redFlags: string[];
};

type Props = {
  subject: AiAnalysisSubject | null;
  onClose: () => void;
};

type Tab = "resumen" | "completo";

const BREAKDOWN_ORDER = ["experiencia", "skillsTecnicos", "seniority", "idiomas", "ubicacion"] as const;
const BREAKDOWN_LABELS: Record<(typeof BREAKDOWN_ORDER)[number], string> = {
  experiencia: "Experiencia",
  skillsTecnicos: "Skills técnicos",
  seniority: "Seniority",
  idiomas: "Idiomas",
  ubicacion: "Ubicación",
};

/**
 * Copiloto de Reclutamiento: mismo modal del prototipo, con lo que hoy calcula la IA real
 * (score, resumen, desglose por categoría, fortalezas y riesgos — ver AiProvider.scoreApplication).
 * Se abre desde el anillo de MATCH en Postulados y Sourcing con IA (mismo `AiAnalysisSubject`
 * genérico para ambos — no está acoplado a `PostuladoRow`).
 */
export function AiAnalysisDialog({ subject, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("completo");

  if (!subject) return null;

  const { score, summary: aiSummary, redFlags: aiRedFlags, breakdown: aiBreakdown, strengths: aiStrengths, name, headline } = subject;
  const confidence = matchConfidence(score);
  const recommendation = matchRecommendation(score);

  return (
    <Dialog
      open
      onClose={onClose}
      side="center"
      ariaLabel={`Copiloto IA — ${name}`}
      className="max-w-md"
    >
      <div className="-m-5 flex flex-col overflow-hidden rounded-[var(--radius)]">
        <div className="relative bg-sidebar px-5 py-5 text-white">
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-lg text-white/50 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="m4 4 8 8M12 4l-8 8" />
            </svg>
          </button>

          <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-primary-light">
            <SparkleIcon size={12} /> Copiloto de reclutamiento
          </p>
          <div className="flex items-center gap-3 pr-8">
            <AiScore score={score} size={48} />
            <div className="min-w-0">
              <p className="truncate font-display text-base font-bold text-white">{name}</p>
              <p className="truncate text-sm text-white/60">{headline ?? "—"}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${CONFIDENCE_TONE[confidence]}`}
            >
              {CONFIDENCE_LABELS[confidence]} confianza
            </span>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold ${RECOMMENDATION_TEXT[recommendation]}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${RECOMMENDATION_DOT[recommendation]}`} aria-hidden />
              {RECOMMENDATION_LABELS[recommendation]}
            </span>
          </div>

          <div className="mt-4 flex gap-1 rounded-lg bg-white/10 p-1">
            <button
              type="button"
              onClick={() => setTab("resumen")}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === "resumen" ? "bg-primary text-white" : "text-white/70 hover:text-white"
              }`}
            >
              Resumen
            </button>
            <button
              type="button"
              onClick={() => setTab("completo")}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === "completo" ? "bg-primary text-white" : "text-white/70 hover:text-white"
              }`}
            >
              Completo
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 bg-surface p-5">
          <div className="rounded-[var(--radius)] bg-primary-light p-4">
            <p className="mb-1.5 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-primary">
              <SparkleIcon size={11} /> Opinión del copiloto
            </p>
            <p className="text-sm leading-relaxed text-text/80">{aiSummary ?? "Sin resumen disponible."}</p>
          </div>

          {tab === "completo" && (
            <>
              {aiBreakdown && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-label">Desglose del match</p>
                  {BREAKDOWN_ORDER.map((key) => (
                    <div key={key} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-text">{BREAKDOWN_LABELS[key]}</span>
                        <span className="font-semibold text-text tabular-nums">{aiBreakdown[key]}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full bg-success"
                          style={{ width: `${aiBreakdown[key]}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {aiStrengths.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-bold uppercase tracking-wide text-label">Fortalezas</p>
                  <ul className="flex flex-col gap-1">
                    {aiStrengths.map((s) => (
                      <li key={s} className="flex items-start gap-1.5 text-sm text-text/80">
                        <span className="mt-0.5 text-success" aria-hidden>✓</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiRedFlags.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-bold uppercase tracking-wide text-label">A validar / riesgos</p>
                  <ul className="flex flex-col gap-1">
                    {aiRedFlags.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-sm text-text/80">
                        <span className="mt-0.5 text-warning" aria-hidden>⚠</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
}
