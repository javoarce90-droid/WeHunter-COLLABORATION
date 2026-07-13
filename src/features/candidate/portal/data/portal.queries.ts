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
import type { Job } from "./mock-jobs";

type RawPortalJob = {
  id: string;
  title: string;
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
  organization: { organizationId: string; name: string; slug: string; logoUrl: string | null };
};

function toJob(raw: RawPortalJob): Job {
  return {
    id: raw.id,
    organizationId: raw.organization.organizationId,
    title: raw.title,
    company: raw.organization.name,
    description: toDescription(raw.objectives),
    location: raw.location || "No especificada",
    workplaceType: toWorkplaceType(raw.modality),
    salary: formatSalary(raw.salaryMin, raw.salaryMax, raw.salaryCurrency),
    tags: raw.skills ?? [],
    defaultStage: "new",
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

/** Ofertas abiertas de todas las organizations con Career Site habilitado (portal/marketplace). */
export async function getPortalJobs(): Promise<Job[]> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) => tx.execute<{ result: RawPortalJob[] }>(sql`select get_portal_jobs() as result`),
    "db.portal.jobs",
  );
  return (rows[0]?.result ?? []).map(toJob);
}
