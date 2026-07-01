import { type Job } from "../data/mock-jobs";

export interface FiltrarEmpleosInput {
  jobs: Job[];
  hiddenIds: string[];
  favoriteIds: string[];
  search: string;
  locationFilter: string;
  filterTab: "all" | "favorites" | "hidden";
}

/**
 * Caso de uso: Filtrar empleos por texto y ubicación, según la pestaña seleccionada (todos, favoritos u ocultos).
 */
export function filtrarEmpleos(input: FiltrarEmpleosInput): Job[] {
  const { jobs, hiddenIds, favoriteIds, search, locationFilter, filterTab } = input;
  const searchLower = search.trim().toLowerCase();
  const locationLower = locationFilter.trim().toLowerCase();

  return jobs.filter((job) => {
    // 1. Filtrar según la pestaña seleccionada
    if (filterTab === "favorites") {
      // Solo favoritos, y que no estén ocultos
      if (!favoriteIds.includes(job.id) || hiddenIds.includes(job.id)) {
        return false;
      }
    } else if (filterTab === "hidden") {
      // Solo los ocultos
      if (!hiddenIds.includes(job.id)) {
        return false;
      }
    } else {
      // Todos (por defecto): excluir ocultos
      if (hiddenIds.includes(job.id)) {
        return false;
      }
    }

    // 2. Filtrar por término de búsqueda (título, compañía o etiquetas de tecnología)
    const matchesSearch =
      !searchLower ||
      job.title.toLowerCase().includes(searchLower) ||
      job.company.toLowerCase().includes(searchLower) ||
      job.tags.some((tag) => tag.toLowerCase().includes(searchLower));

    // 3. Filtrar por ubicación física/remoto
    const matchesLocation =
      !locationLower ||
      job.location.toLowerCase().includes(locationLower);

    return matchesSearch && matchesLocation;
  });
}
