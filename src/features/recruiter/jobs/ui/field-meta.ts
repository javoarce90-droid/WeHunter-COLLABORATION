import type {
  JobModality,
  JobSeniority,
  JobPriority,
  EmploymentType,
} from "../domain/job-details";

/** Etiquetas en español de los campos ricos. Compartidas por el form y el detalle. */

export const MODALITY_LABELS: Record<JobModality, string> = {
  onsite: "Presencial",
  remote: "Remoto",
  hybrid: "Híbrido",
};

export const SENIORITY_LABELS: Record<JobSeniority, string> = {
  junior: "Junior",
  semisenior: "Semi-senior",
  senior: "Senior",
  lead: "Lead",
};

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contrato",
  internship: "Pasantía",
  temporary: "Temporal",
};

export const PRIORITY_LABELS: Record<JobPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

export const PRIORITY_BADGE: Record<JobPriority, "muted" | "warning" | "danger"> = {
  low: "muted",
  medium: "warning",
  high: "danger",
};
