import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "./spinner";

/** Ícono ✦ de IA (sparkle). */
export function SparkleIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2zM19 14l.8 2.4L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.6L19 14z" />
    </svg>
  );
}

const aiButtonVariantClasses = {
  // Gradiente ✦ accesible: el extremo claro se mantiene en #7C3AED (~5.6:1 con blanco),
  // no #9D6DF1 (~3.55:1, falla AA). Accesibilidad de PRODUCT.md > hex exacto de DESIGN.md.
  solid:
    "bg-gradient-to-r from-primary to-[#7C3AED] text-white hover:opacity-90 disabled:opacity-50",
  // Mismo botón, invertido: fondo blanco/superficie con texto y sparkle violeta. Para cuando
  // dos acciones de IA quedan una al lado de la otra y el gradiente sólido de las dos compite —
  // una se queda con el sólido (la más prominente), la otra con este.
  outline:
    "border border-border bg-surface text-primary hover:bg-primary-light disabled:opacity-50",
};

/**
 * Botón de acción de IA. Tratamiento ✦ del design system (DESIGN.md): gradiente
 * primary → ai (o su inverso, `variant="outline"`), con el sparkle. Para acciones generativas.
 */
export function AiButton({
  variant = "solid",
  className = "",
  children,
  loading = false,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof aiButtonVariantClasses;
  loading?: boolean;
}) {
  return (
    <button
      className={[
        "relative inline-flex items-center justify-center gap-2 rounded-[var(--radius)] px-3 py-2 text-xs font-semibold",
        "outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
        aiButtonVariantClasses[variant],
        className,
      ].join(" ")}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </span>
      )}
      <span className={loading ? "contents invisible" : "contents"}>
        <SparkleIcon size={13} />
        {children}
      </span>
    </button>
  );
}

/** Bandas del score de compatibilidad IA (0-100) — fuente única. `MatchCell` las reusa para
 *  confianza/recomendación, no solo el color del anillo. */
export type ScoreBand = "alta" | "media" | "baja";
export function scoreBand(score: number): ScoreBand {
  if (score >= 75) return "alta";
  if (score >= 50) return "media";
  return "baja";
}

function scoreColor(score: number): string {
  const band = scoreBand(score);
  if (band === "alta") return "var(--success)";
  if (band === "media") return "#EA580C"; // warning
  return "var(--danger)";
}

/**
 * Score circle de IA (conic-gradient). Muestra la compatibilidad estimada 0–100 como anillo
 * proporcional + número. El color va por banda (verde/ámbar/rojo).
 */
export function AiScore({
  score,
  size = 30,
  detail,
}: {
  score: number;
  size?: number;
  /** Resumen del match para el tooltip (ej. ai_summary). */
  detail?: string | null;
}) {
  const color = scoreColor(score);
  const ring = size;
  const inner = size - 6;
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: ring,
        height: ring,
        background: `conic-gradient(${color} ${score * 3.6}deg, var(--border) 0deg)`,
      }}
      role="img"
      aria-label={`Score IA ${score} de 100${detail ? `. ${detail}` : ""}`}
      title={`Compatibilidad IA: ${score}/100${detail ? `\n${detail}` : ""}`}
    >
      <span
        className="flex items-center justify-center rounded-full bg-surface font-bold tabular-nums text-text"
        style={{ width: inner, height: inner, fontSize: size <= 24 ? 8 : 10 }}
      >
        {score}
      </span>
    </span>
  );
}
