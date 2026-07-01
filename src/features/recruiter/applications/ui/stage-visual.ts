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
