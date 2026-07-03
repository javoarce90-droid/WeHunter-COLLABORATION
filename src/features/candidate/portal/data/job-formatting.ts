import { MODALITY_LABELS } from "@/features/recruiter/jobs/ui/field-meta";
import type { JobModality } from "@/features/recruiter/jobs/domain/job-details";
import type { Job } from "./mock-jobs";

/** Formatters compartidos entre portal.queries.ts y applications.queries.ts para mapear
 * campos reales de `jobs` al shape que ya consume la UI del portal (JobCard, etc). */

export function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
): string {
  if (!currency || (!min && !max)) return "";
  const fmt = (n: number) => n.toLocaleString("es-AR");
  if (min && max) return `$${fmt(min)} - $${fmt(max)} ${currency}`;
  return `$${fmt((min ?? max) as number)} ${currency}`;
}

/** Preview corta a partir del copy público (Markdown) del aviso. Nunca `jobs.description`:
 * ese es el brief interno del recruiter, no está pensado para mostrarse. */
export function toDescription(objectives: string | null): string {
  if (!objectives) return "Sin descripción disponible.";
  return objectives.replace(/[#*_`>-]/g, "").trim().slice(0, 280);
}

export function toWorkplaceType(modality: JobModality | null): Job["workplaceType"] {
  return modality ? (MODALITY_LABELS[modality] as Job["workplaceType"]) : "Remoto";
}
