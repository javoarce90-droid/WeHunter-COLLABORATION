/**
 * Caso de uso: Alternar (agregar o quitar) un empleo de la lista de favoritos.
 */
export function alternarFavorito(favorites: string[], jobId: string): string[] {
  if (favorites.includes(jobId)) {
    return favorites.filter((id) => id !== jobId);
  }
  return [...favorites, jobId];
}
