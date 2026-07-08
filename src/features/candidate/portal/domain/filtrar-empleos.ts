import { type Job } from "../data/mock-jobs";

export interface FiltrarEmpleosInput {
  jobs: Job[];
  appliedIds: string[];
  search: string;
  locationFilter: string;
}

/**
 * Caso de uso: Filtrar empleos por texto y ubicación, excluyendo los que el candidato ya
 * tiene postulación activa (esos se ven en "Mis Postulaciones", no en el explorador).
 */
export function filtrarEmpleos(input: FiltrarEmpleosInput): Job[] {
  const { jobs, appliedIds, search, locationFilter } = input;
  const searchLower = search.trim().toLowerCase();
  const locationLower = locationFilter.trim().toLowerCase();

  return jobs.filter((job) => {
    if (appliedIds.includes(job.id)) return false;

    const matchesSearch =
      !searchLower ||
      job.title.toLowerCase().includes(searchLower) ||
      job.company.toLowerCase().includes(searchLower) ||
      job.tags.some((tag) => tag.toLowerCase().includes(searchLower));

    const matchesLocation =
      !locationLower ||
      job.location.toLowerCase().includes(locationLower);

    return matchesSearch && matchesLocation;
  });
}
