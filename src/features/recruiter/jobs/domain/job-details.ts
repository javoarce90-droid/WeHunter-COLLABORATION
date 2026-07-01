/**
 * Campos ricos de una búsqueda (paridad demo), compartidos entre crear y editar.
 * El input llega ya validado por Zod (valores tipados o undefined); acá normalizamos
 * undefined/vacío → null para la capa data. Reglas de negocio livianas (salario coherente).
 */

export type JobModality = "onsite" | "remote" | "hybrid";
export type JobSeniority = "junior" | "semisenior" | "senior" | "lead";
export type JobPriority = "low" | "medium" | "high";
export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "internship"
  | "temporary"
  | "freelance";
export type JobArea =
  | "tecnologia"
  | "salud"
  | "finanzas"
  | "ventas"
  | "marketing"
  | "rrhh"
  | "operaciones"
  | "legal"
  | "educacion"
  | "ingenieria"
  | "diseno"
  | "atencion_cliente"
  | "otro";

export interface Benefit {
  name: string;
  description: string;
}

export interface JobDetailsInput {
  posting?: string | null;
  clientId?: string | null;
  position?: string | null;
  jobArea?: JobArea | null;
  location?: string | null;
  modality?: JobModality | null;
  seniority?: JobSeniority | null;
  employmentType?: EmploymentType | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  skills?: string[] | null;
  priority?: JobPriority | null;
  deadline?: string | null;
  vacancies?: number | null;
  objectives?: string | null;
  requirements?: string | null;
  responsibilities?: string | null;
  benefits?: Benefit[] | null;
}

export interface JobDetails {
  posting: string | null;
  clientId: string | null;
  position: string | null;
  jobArea: JobArea | null;
  location: string | null;
  modality: JobModality | null;
  seniority: JobSeniority | null;
  employmentType: EmploymentType | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  skills: string[] | null;
  priority: JobPriority | null;
  deadline: string | null;
  vacancies: number | null;
  objectives: string | null;
  requirements: string | null;
  responsibilities: string | null;
  benefits: Benefit[] | null;
}

const clean = (s?: string | null) => (s?.trim() ? s.trim() : null);

function cleanBenefits(benefits?: Benefit[] | null): Benefit[] | null {
  if (!benefits?.length) return null;
  const out = benefits
    .map((b) => ({ name: b.name?.trim() ?? "", description: b.description?.trim() ?? "" }))
    .filter((b) => b.name || b.description);
  return out.length ? out : null;
}

export function normalizeJobDetails(input: JobDetailsInput): JobDetails {
  // Si solo se cargó un extremo del rango salarial, lo respetamos; si vinieron los dos
  // invertidos, los ordenamos (regla liviana para no guardar un rango imposible).
  let salaryMin = input.salaryMin ?? null;
  let salaryMax = input.salaryMax ?? null;
  if (salaryMin != null && salaryMax != null && salaryMin > salaryMax) {
    [salaryMin, salaryMax] = [salaryMax, salaryMin];
  }

  return {
    posting: clean(input.posting),
    clientId: input.clientId ?? null,
    position: clean(input.position),
    jobArea: input.jobArea ?? null,
    location: clean(input.location),
    modality: input.modality ?? null,
    seniority: input.seniority ?? null,
    employmentType: input.employmentType ?? null,
    salaryMin,
    salaryMax,
    salaryCurrency: clean(input.salaryCurrency),
    skills: input.skills && input.skills.length ? input.skills : null,
    priority: input.priority ?? null,
    deadline: clean(input.deadline),
    vacancies: input.vacancies ?? null,
    objectives: clean(input.objectives),
    requirements: clean(input.requirements),
    responsibilities: clean(input.responsibilities),
    benefits: cleanBenefits(input.benefits),
  };
}
