import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import type {
  JobModality,
  JobArea,
  JobSeniority,
  EmploymentType,
  Benefit,
} from "@/features/recruiter/jobs/domain/job-details";
import { formatSalary, toDescription, toWorkplaceType } from "./job-formatting";
import type { PortalApplication } from "../domain/gestionar-postulacion";

type RawMyApplication = {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  company: string;
  appliedAt: string;
  stage: PortalApplication["stage"];
  fullName: string;
  cvUrl: string | null;
  jobArea: JobArea | null;
  location: string | null;
  modality: JobModality | null;
  seniority: JobSeniority | null;
  employmentType: EmploymentType | null;
  vacancies: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  skills: string[] | null;
  objectives: string | null;
  requirements: string | null;
  responsibilities: string | null;
  benefits: Benefit[] | null;
};

function toPortalApplication(raw: RawMyApplication): PortalApplication {
  return {
    applicationId: raw.applicationId,
    jobId: raw.jobId,
    jobTitle: raw.jobTitle,
    company: raw.company,
    appliedAt: raw.appliedAt,
    stage: raw.stage,
    fullName: raw.fullName,
    cvUrl: raw.cvUrl,
    location: raw.location || "No especificada",
    workplaceType: toWorkplaceType(raw.modality),
    salary: formatSalary(raw.salaryMin, raw.salaryMax, raw.salaryCurrency),
    description: toDescription(raw.objectives),
    tags: raw.skills ?? [],
    jobArea: raw.jobArea,
    seniority: raw.seniority,
    employmentType: raw.employmentType,
    vacancies: raw.vacancies,
    objectives: raw.objectives,
    requirements: raw.requirements,
    responsibilities: raw.responsibilities,
    benefits: raw.benefits,
  };
}

/** Todas las postulaciones del candidato autenticado, en cualquier organization (join hecho
 * en get_my_applications: jobs/organizations no son legibles por RLS para un no-miembro). */
export async function getMyApplications(): Promise<PortalApplication[]> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) => tx.execute<{ result: RawMyApplication[] }>(sql`select get_my_applications() as result`),
    "db.portal.myApplications",
  );
  return (rows[0]?.result ?? []).map(toPortalApplication);
}
