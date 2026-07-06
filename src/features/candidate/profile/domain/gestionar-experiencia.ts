import { ok, err, type Result } from "@/lib/result";
import type { EmploymentType, JobModality } from "@/features/recruiter/jobs/domain/job-details";

/** Dueño de una fila de currículum: o el perfil global del candidato (autoservicio), o una
 * fila del pool de un recruiter (candidate_id, nota de sourcing). Nunca ambos — mismo
 * criterio que el constraint de la tabla. */
export type ResumeOwner =
  | { kind: "profile"; profileId: string }
  | { kind: "candidate"; candidateId: string };

export interface ExperienciaInput {
  company: string;
  position: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  employmentType?: EmploymentType;
  modality?: JobModality;
  /** Texto separado por comas, tal como lo manda el form (mismo criterio que el perfil). */
  skills?: string;
}

export interface NormalizedExperiencia {
  company: string;
  position: string;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  employmentType: EmploymentType | null;
  modality: JobModality | null;
  skills: string[] | null;
}

/** Exportada para reusar la misma validación desde completarOnboardingConIa (onboarding con IA). */
export function normalizeExperiencia(input: ExperienciaInput): Result<NormalizedExperiencia> {
  const company = input.company.trim();
  if (!company) return err("La empresa es obligatoria.");
  const position = input.position.trim();
  if (!position) return err("El puesto es obligatorio.");

  const skills = input.skills
    ? Array.from(new Set(input.skills.split(",").map((s) => s.trim()).filter(Boolean)))
    : null;

  return ok({
    company,
    position,
    startDate: input.startDate?.trim() || null,
    endDate: input.endDate?.trim() || null,
    description: input.description?.trim() || null,
    employmentType: input.employmentType ?? null,
    modality: input.modality ?? null,
    skills,
  });
}

export interface AgregarExperienciaDeps {
  insertExperience: (owner: ResumeOwner, data: NormalizedExperiencia) => Promise<{ id: string }>;
}

export async function agregarExperiencia(
  input: ExperienciaInput,
  owner: ResumeOwner,
  deps: AgregarExperienciaDeps,
): Promise<Result<{ id: string }>> {
  const normalized = normalizeExperiencia(input);
  if (!normalized.ok) return normalized;

  const created = await deps.insertExperience(owner, normalized.data);
  return ok({ id: created.id });
}

export interface EditarExperienciaDeps {
  updateExperience: (
    id: string,
    owner: ResumeOwner,
    data: NormalizedExperiencia,
  ) => Promise<boolean>;
}

export async function editarExperiencia(
  id: string,
  input: ExperienciaInput,
  owner: ResumeOwner,
  deps: EditarExperienciaDeps,
): Promise<Result<{ id: string }>> {
  const normalized = normalizeExperiencia(input);
  if (!normalized.ok) return normalized;

  const updated = await deps.updateExperience(id, owner, normalized.data);
  if (!updated) return err("No se encontró la experiencia o no te pertenece.");
  return ok({ id });
}

export interface EliminarExperienciaDeps {
  deleteExperience: (id: string, owner: ResumeOwner) => Promise<boolean>;
}

export async function eliminarExperiencia(
  id: string,
  owner: ResumeOwner,
  deps: EliminarExperienciaDeps,
): Promise<Result<{ id: string }>> {
  const deleted = await deps.deleteExperience(id, owner);
  if (!deleted) return err("No se encontró la experiencia o no te pertenece.");
  return ok({ id });
}
