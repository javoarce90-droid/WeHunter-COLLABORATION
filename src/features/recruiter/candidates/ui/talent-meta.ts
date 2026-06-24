import type { TalentState } from "../domain/cambiar-estado-talento";

export const TALENT_STATE_LABELS: Record<TalentState, string> = {
  active: "Activo",
  passive: "Pool pasivo",
  contacted: "Contactado",
  archived: "Archivado",
};

/** Variante de Badge por estado (vocabulario del design system). */
export const TALENT_STATE_BADGE: Record<
  TalentState,
  "success" | "blue" | "warning" | "muted"
> = {
  active: "success",
  passive: "blue",
  contacted: "warning",
  archived: "muted",
};

/** Transiciones que ofrece el menú según el estado actual (todas las demás). */
export const TALENT_STATE_ORDER: TalentState[] = [
  "active",
  "passive",
  "contacted",
  "archived",
];
