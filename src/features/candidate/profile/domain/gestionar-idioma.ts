import { ok, err, type Result } from "@/lib/result";
import { languageLevel, type LanguageLevel } from "@/db/schema";
import type { ResumeOwner } from "./gestionar-experiencia";

export type { ResumeOwner };

export interface IdiomaInput {
  language: string;
  level: string;
}

export interface NormalizedIdioma {
  language: string;
  level: LanguageLevel;
}

export function normalizeIdioma(input: IdiomaInput): Result<NormalizedIdioma> {
  const language = input.language.trim();
  if (!language) return err("El idioma es obligatorio.");

  const level = input.level as LanguageLevel;
  if (!languageLevel.enumValues.includes(level)) return err("Nivel de idioma inválido.");

  return ok({ language, level });
}

export interface AgregarIdiomaDeps {
  insertLanguage: (owner: ResumeOwner, data: NormalizedIdioma) => Promise<{ id: string }>;
}

export async function agregarIdioma(
  input: IdiomaInput,
  owner: ResumeOwner,
  deps: AgregarIdiomaDeps,
): Promise<Result<{ id: string }>> {
  const normalized = normalizeIdioma(input);
  if (!normalized.ok) return normalized;

  const created = await deps.insertLanguage(owner, normalized.data);
  return ok({ id: created.id });
}

export interface EliminarIdiomaDeps {
  deleteLanguage: (id: string, owner: ResumeOwner) => Promise<boolean>;
}

export async function eliminarIdioma(
  id: string,
  owner: ResumeOwner,
  deps: EliminarIdiomaDeps,
): Promise<Result<{ id: string }>> {
  const deleted = await deps.deleteLanguage(id, owner);
  if (!deleted) return err("No se encontró el idioma o no te pertenece.");
  return ok({ id });
}
