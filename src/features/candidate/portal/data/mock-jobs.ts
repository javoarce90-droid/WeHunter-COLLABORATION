import type { JobArea, JobSeniority, EmploymentType, Benefit } from "@/features/recruiter/jobs/domain/job-details";

/** Shape que consume la UI del portal (JobCard, filtrar-empleos, etc). Ensamblado desde
 * datos reales en portal.queries.ts (ver getPortalJobs) — el nombre del archivo quedó de
 * cuando esto era 100% mock. */
export interface Job {
  id: string;
  /** No se muestra en la UI; hace falta para subir el CV al path correcto al postularse. */
  organizationId: string;
  title: string;
  company: string;
  description: string;
  location: string;
  workplaceType: "Remoto" | "Híbrido" | "Presencial";
  salary: string;
  tags: string[];
  defaultStage: "new" | "screening" | "interview" | "offer" | "hired" | "rejected";
  /** Campos ricos del detalle (JobDetailsModal). Null si el recruiter no los cargó. */
  jobArea: JobArea | null;
  seniority: JobSeniority | null;
  employmentType: EmploymentType | null;
  vacancies: number | null;
  objectives: string | null;
  requirements: string | null;
  responsibilities: string | null;
  benefits: Benefit[] | null;
}
