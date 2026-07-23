import { isClosingStage, type ApplicationStage } from "../schema";

/** Color sólido por etapa para marcadores de columna/dots (semántica de DESIGN.md). */
export const STAGE_DOT: Record<ApplicationStage, string> = {
  new: "#9CA3AF",
  screening: "#2563EB",
  interview: "#D97706",
  interview_hr: "#F59E0B",
  interview_tech: "#B45309",
  interview_client: "#7B2FDB",
  offer: "#8B5CF6",
  hired: "#059669",
  rejected: "#DC2626",
};

export function isTerminal(stage: ApplicationStage): boolean {
  return isClosingStage(stage);
}

/**
 * Color de texto (blanco o tinta) que mejor contrasta sobre un fondo sólido `hex`. Para
 * etiquetas encima de barras coloreadas: la paleta de stages tiene tonos claros (ej. `new`
 * #9CA3AF, `interview_hr` #F59E0B) donde el blanco falla AA. Elige el de mayor contraste WCAG.
 */
export function readableTextOn(hex: string): "#FFFFFF" | "#0F0A1A" {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = channel(parseInt(hex.slice(1, 3), 16));
  const g = channel(parseInt(hex.slice(3, 5), 16));
  const b = channel(parseInt(hex.slice(5, 7), 16));
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const contrast = (a: number, z: number) => (Math.max(a, z) + 0.05) / (Math.min(a, z) + 0.05);
  // Luminancia de la tinta --text (#0F0A1A) ≈ 0.006.
  return contrast(lum, 1) >= contrast(lum, 0.006) ? "#FFFFFF" : "#0F0A1A";
}

export type SlaStatus = { status: "over" | "warn"; days: number };

/** SLA de una card: null = dentro de plazo (sin badge), "warn" = 75%+ consumido, "over" = vencido. */
export function getSlaStatus(
  enteredStageAt: Date | undefined,
  slaDays: number | null | undefined,
): SlaStatus | null {
  if (!slaDays || !enteredStageAt) return null;
  const days = Math.floor((Date.now() - enteredStageAt.getTime()) / 86400000);
  if (days >= slaDays) return { status: "over", days };
  if (days >= Math.floor(slaDays * 0.75)) return { status: "warn", days };
  return null;
}

/** "hace 3 d", "hace 2 h" — relativo compacto para metadata de card. */
export function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "recién";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `hace ${days} d`;
  const months = Math.round(days / 30);
  return `hace ${months} mes${months !== 1 ? "es" : ""}`;
}
