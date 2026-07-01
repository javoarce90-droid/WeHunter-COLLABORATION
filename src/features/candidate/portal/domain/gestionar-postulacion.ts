import { type Job } from "../data/mock-jobs";

export type ApplicationStage = "new" | "screening" | "interview" | "offer" | "hired" | "rejected";

export interface MockApplication {
  jobId: string;
  jobTitle: string;
  company: string;
  appliedAt: string;
  stage: ApplicationStage;
  fullName: string;
  cvName: string;
}

/**
 * Caso de uso: Crear una nueva postulación y agregarla a la lista existente.
 */
export function crearPostulacion(
  job: Job,
  fullName: string,
  cvName: string,
  existingApplications: MockApplication[],
  appliedAtDate?: string
): {
  newApplication: MockApplication;
  updatedApplications: MockApplication[];
} {
  if (!fullName.trim()) {
    throw new Error("El nombre completo es obligatorio.");
  }
  if (!cvName.trim()) {
    throw new Error("El nombre del archivo de CV es obligatorio.");
  }

  const newApplication: MockApplication = {
    jobId: job.id,
    jobTitle: job.title,
    company: job.company,
    appliedAt: appliedAtDate || new Date().toLocaleDateString(),
    stage: job.defaultStage,
    fullName: fullName.trim(),
    cvName: cvName.trim(),
  };

  return {
    newApplication,
    updatedApplications: [newApplication, ...existingApplications],
  };
}

/**
 * Caso de uso: Retirar una postulación existente.
 */
export function retirarPostulacion(
  applications: MockApplication[],
  jobId: string
): MockApplication[] {
  return applications.filter((app) => app.jobId !== jobId);
}
