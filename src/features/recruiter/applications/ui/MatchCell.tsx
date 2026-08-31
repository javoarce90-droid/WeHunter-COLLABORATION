import { AiScore, scoreBand, type ScoreBand } from "@/components/ui/ai";

/** Confianza y recomendación se derivan del mismo score de compatibilidad (no son datos
 *  separados que calcule la IA hoy) — mismas bandas que `scoreBand` de `ai.tsx` (fuente única).
 *  Compartidas por la tabla de Postulados, su ficha de detalle y el modal del Copiloto IA. */
export type Confidence = ScoreBand;
export function matchConfidence(score: number): Confidence {
  return scoreBand(score);
}
export const CONFIDENCE_LABELS: Record<Confidence, string> = { alta: "Alta", media: "Media", baja: "Baja" };
export const CONFIDENCE_TONE: Record<Confidence, string> = {
  alta: "bg-[#DCFCE7] text-[#166534]",
  media: "bg-[#FEF3C7] text-[#92400E]",
  baja: "bg-bg text-muted",
};

/** Debajo de este % de completitud, un match bajo se atribuye a falta de datos, no a un mal
 *  perfil — la recomendación pasa a "Datos insuficientes" en vez de "Descartar". */
export const LOW_COMPLETENESS_THRESHOLD = 40;

export type Recommendation =
  | "avanzar"
  | "revisar"
  | "descartar"
  | "insuficiente";
const RECOMMENDATION_BY_BAND: Record<ScoreBand, Recommendation> = {
  alta: "avanzar",
  media: "revisar",
  baja: "descartar",
};

/**
 * Recomendación derivada de la banda de score, con una salvaguarda (feedback del cliente): NO
 * recomendar "Descartar" cuando el score bajo puede explicarse por falta de datos —
 * `completeness` bajo (perfil casi vacío) o `degraded` (el score lo hizo el heurístico local, no
 * la IA). En esos casos se muestra "Datos insuficientes": el recruiter carga más info y vuelve
 * a evaluar en vez de descartar a ciegas.
 */
export function matchRecommendation(
  score: number,
  opts?: { completeness?: number | null; degraded?: boolean },
): Recommendation {
  const base = RECOMMENDATION_BY_BAND[scoreBand(score)];
  if (base === "descartar") {
    const thinProfile =
      opts?.completeness != null &&
      opts.completeness < LOW_COMPLETENESS_THRESHOLD;
    if (thinProfile || opts?.degraded) return "insuficiente";
  }
  return base;
}
export const RECOMMENDATION_LABELS: Record<Recommendation, string> = {
  avanzar: "Avanzar",
  revisar: "Revisar",
  descartar: "Descartar",
  insuficiente: "Falta info",
};
/** Explicación larga de "Falta info" — va en `title`/tooltip, no en la celda. */
export const INSUFICIENTE_HINT =
  "El match es bajo, pero el perfil tiene poca información cargada — puede ser falta de datos, no un mal candidato. Completá el perfil y volvé a evaluar.";
export const RECOMMENDATION_DOT: Record<Recommendation, string> = {
  avanzar: "bg-success",
  revisar: "bg-warning",
  descartar: "bg-danger",
  insuficiente: "bg-muted",
};
export const RECOMMENDATION_TEXT: Record<Recommendation, string> = {
  avanzar: "text-success",
  revisar: "text-warning",
  descartar: "text-danger",
  insuficiente: "text-muted",
};

/** Caveat inline cuando el score no lo produjo la IA real (feedback INF-1). Mismo texto en la
 *  celda y en el modal del Copiloto. */
export const DEGRADED_HINT =
  "Este % lo calculó una estimación local, no el análisis de IA. Volvé a analizar para el número real.";

export function MatchCell({
  score,
  summary,
  size = 32,
  completeness,
  degraded,
  onOpenCopiloto,
}: {
  score: number | null;
  summary: string | null;
  size?: number;
  /** % de completitud del perfil (0-100). Si es bajo, un match bajo se muestra como "Datos
   *  insuficientes" en vez de "Descartar". Omitir para candidatos externos (sourcing). */
  completeness?: number | null;
  /** true si el score lo produjo el heurístico local y no la IA real. */
  degraded?: boolean;
  /** Si viene, el anillo se vuelve clickeable y abre el modal del Copiloto IA. */
  onOpenCopiloto?: () => void;
}) {
  if (score == null) return <span className="text-xs text-muted">—</span>;
  const confidence = matchConfidence(score);
  const recommendation = matchRecommendation(score, { completeness, degraded });
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
          title={recommendation === "insuficiente" ? INSUFICIENTE_HINT : undefined}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${RECOMMENDATION_DOT[recommendation]}`} aria-hidden />
          {RECOMMENDATION_LABELS[recommendation]}
          {degraded && (
            <span className="font-normal text-muted" title={DEGRADED_HINT}>
              · sin IA
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
