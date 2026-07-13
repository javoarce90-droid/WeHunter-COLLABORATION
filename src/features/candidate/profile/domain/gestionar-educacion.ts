import { ok, err, type Result } from "@/lib/result";
import type { ResumeOwner } from "./gestionar-experiencia";

export type { ResumeOwner };

export interface EducacionInput {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  grade?: string;
  activities?: string;
}

export interface NormalizedEducacion {
  institution: string;
  degree: string;
  fieldOfStudy: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  grade: string | null;
  activities: string | null;
}

/** Exportada para reusar la misma validación desde completarOnboardingConIa (onboarding con IA). */
export function normalizeEducacion(input: EducacionInput): Result<NormalizedEducacion> {
  const institution = input.institution.trim();
  if (!institution) return err("La institución es obligatoria.");
  const degree = input.degree.trim();
  if (!degree) return err("El título o carrera es obligatorio.");

  return ok({
    institution,
    degree,
    fieldOfStudy: input.fieldOfStudy?.trim() || null,
    startDate: input.startDate?.trim() || null,
    endDate: input.endDate?.trim() || null,
    description: input.description?.trim() || null,
    grade: input.grade?.trim() || null,
    activities: input.activities?.trim() || null,
  });
}

export interface AgregarEducacionDeps {
  insertEducation: (owner: ResumeOwner, data: NormalizedEducacion) => Promise<{ id: string }>;
}

export async function agregarEducacion(
  input: EducacionInput,
  owner: ResumeOwner,
  deps: AgregarEducacionDeps,
): Promise<Result<{ id: string }>> {
  const normalized = normalizeEducacion(input);
  if (!normalized.ok) return normalized;

  const created = await deps.insertEducation(owner, normalized.data);
  return ok({ id: created.id });
}

export interface EditarEducacionDeps {
  updateEducation: (id: string, owner: ResumeOwner, data: NormalizedEducacion) => Promise<boolean>;
}

export async function editarEducacion(
  id: string,
  input: EducacionInput,
  owner: ResumeOwner,
  deps: EditarEducacionDeps,
): Promise<Result<{ id: string }>> {
  const normalized = normalizeEducacion(input);
  if (!normalized.ok) return normalized;

  const updated = await deps.updateEducation(id, owner, normalized.data);
  if (!updated) return err("No se encontró la educación o no te pertenece.");
  return ok({ id });
}

export interface EliminarEducacionDeps {
  deleteEducation: (id: string, owner: ResumeOwner) => Promise<boolean>;
}

export async function eliminarEducacion(
  id: string,
  owner: ResumeOwner,
  deps: EliminarEducacionDeps,
): Promise<Result<{ id: string }>> {
  const deleted = await deps.deleteEducation(id, owner);
  if (!deleted) return err("No se encontró la educación o no te pertenece.");
  return ok({ id });
}
