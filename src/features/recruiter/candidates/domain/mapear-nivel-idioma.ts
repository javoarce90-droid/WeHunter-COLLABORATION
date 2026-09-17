import type { LanguageLevel } from "@/db/schema";

/** Nivel a usar cuando el texto libre del proveedor no matchea ningún patrón conocido — ni el
 *  más bajo (para no subestimar a alguien que puso un idioma en su perfil) ni el más alto (para
 *  no sobrevender). Intermedio es el punto medio seguro. */
const DEFAULT_LEVEL: LanguageLevel = "intermedio";

/**
 * Mapea el nivel de idioma en texto libre que devuelve HarvestAPI (calcado de las categorías de
 * "Language proficiency" de LinkedIn: Elementary / Limited working / Professional working /
 * Full professional / Native or bilingual) al enum `languageLevel` de WeHunter
 * (basico/intermedio/avanzado/nativo). No es una traducción 1 a 1 — colapsa "professional
 * working" y "full professional" en "avanzado" porque el enum de WeHunter no distingue esos dos
 * matices.
 */
export function mapearNivelIdioma(raw: string | null | undefined): LanguageLevel {
  if (!raw) return DEFAULT_LEVEL;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return DEFAULT_LEVEL;

  if (normalized.includes("native") || normalized.includes("bilingual") || normalized.includes("nativo")) {
    return "nativo";
  }
  if (normalized.includes("full professional") || normalized.includes("professional working")) {
    return "avanzado";
  }
  if (normalized.includes("professional")) {
    return "avanzado";
  }
  if (normalized.includes("limited working")) {
    return "intermedio";
  }
  if (normalized.includes("elementary") || normalized.includes("basic")) {
    return "basico";
  }
  return DEFAULT_LEVEL;
}
