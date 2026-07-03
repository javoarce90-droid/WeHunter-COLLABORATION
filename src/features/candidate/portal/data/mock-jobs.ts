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
}
