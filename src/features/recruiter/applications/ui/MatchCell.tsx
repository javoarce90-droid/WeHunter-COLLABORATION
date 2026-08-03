import { AiScore } from "@/components/ui/ai";

/** Confianza y recomendación se derivan del mismo score de compatibilidad (no son datos
 *  separados que calcule la IA hoy) — mismas bandas que ya usa `scoreColor` en `ai.tsx`.
 *  Compartidas por la tabla de Postulados, su ficha de detalle y el modal del Copiloto IA. */
export type Confidence = "alta" | "media" | "baja";
export function matchConfidence(score: number): Confidence {
  if (score >= 75) return "alta";
  if (score >= 50) return "media";
  return "baja";
}
export const CONFIDENCE_LABELS: Record<Confidence, string> = { alta: "Alta", media: "Media", baja: "Baja" };
export const CONFIDENCE_TONE: Record<Confidence, string> = {
  alta: "bg-[#DCFCE7] text-[#166534]",
  media: "bg-[#FEF3C7] text-[#92400E]",
  baja: "bg-bg text-muted",
};

export type Recommendation = "avanzar" | "revisar" | "descartar";
export function matchRecommendation(score: number): Recommendation {
  if (score >= 75) return "avanzar";
  if (score >= 50) return "revisar";
  return "descartar";
}
export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  avanzar: "Avanzar",
  revisar: "Revisar",
  descartar: "Descartar",
};
export const RECOMMENDATION_DOT: Record<Recommendation, string> = {
  avanzar: "bg-success",
  revisar: "bg-warning",
  descartar: "bg-danger",
};
export const RECOMMENDATION_TEXT: Record<Recommendation, string> = {
  avanzar: "text-success",
  revisar: "text-warning",
  descartar: "text-danger",
};

export function MatchCell({
  score,
  summary,
  size = 32,
  onOpenCopiloto,
}: {
  score: number | null;
  summary: string | null;
  size?: number;
  /** Si viene, el anillo se vuelve clickeable y abre el modal del Copiloto IA. */
  onOpenCopiloto?: () => void;
}) {
  if (score == null) return <span className="text-xs text-muted">—</span>;
  const confidence = matchConfidence(score);
  const recommendation = matchRecommendation(score);
  return (
    <div className="flex items-center gap-2">
      {onOpenCopiloto ? (
        <button
          type="button"
          onClick={onOpenCopiloto}
          aria-label={`Ver Copiloto IA — ${score} de 100`}
          className="rounded-full outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        >
          <AiScore score={score} size={size} detail={summary} />
        </button>
      ) : (
        <AiScore score={score} size={size} detail={summary} />
      )}
      <div className="flex flex-col gap-0.5">
        <span
          className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${CONFIDENCE_TONE[confidence]}`}
        >
          {CONFIDENCE_LABELS[confidence]}
        </span>
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${RECOMMENDATION_TEXT[recommendation]}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${RECOMMENDATION_DOT[recommendation]}`} aria-hidden />
          {RECOMMENDATION_LABELS[recommendation]}
        </span>
      </div>
    </div>
  );
}
