import type { ButtonHTMLAttributes } from "react";

/** Ícono ✦ de IA (sparkle). */
export function SparkleIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2zM19 14l.8 2.4L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.6L19 14z" />
    </svg>
  );
}

/**
 * Botón de acción de IA. Tratamiento ✦ del design system (DESIGN.md): gradiente
 * primary → ai en el FONDO (nunca en el texto), con el sparkle. Para acciones generativas.
 */
export function AiButton({
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center gap-1.5 rounded-[var(--radius)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity",
        // Gradiente ✦ accesible: el extremo claro se mantiene en #7C3AED (~5.6:1 con blanco),
        // no #9D6DF1 (~3.55:1, falla AA). Accesibilidad de PRODUCT.md > hex exacto de DESIGN.md.
        "bg-gradient-to-r from-primary to-[#7C3AED] hover:opacity-90 disabled:opacity-50",
        className,
      ].join(" ")}
      {...props}
    >
      <SparkleIcon size={13} />
      {children}
    </button>
  );
}

function scoreColor(score: number): string {
  if (score >= 75) return "var(--success)";
  if (score >= 50) return "#EA580C"; // warning
  return "var(--danger)";
}

/**
 * Score circle de IA (conic-gradient). Muestra la compatibilidad estimada 0–100 como anillo
 * proporcional + número. El color va por banda (verde/ámbar/rojo).
 */
export function AiScore({ score, size = 30 }: { score: number; size?: number }) {
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
      aria-label={`Score IA ${score} de 100`}
      title={`Compatibilidad IA: ${score}/100`}
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
