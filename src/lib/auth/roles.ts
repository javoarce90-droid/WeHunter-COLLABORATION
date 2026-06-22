import type { OrgRole } from "./session";

/**
 * Predicados de rol reutilizables por la capa domain de las features.
 * La autorización primaria vive en cada caso de uso; esto centraliza el "quién puede".
 */

/** Roles que operan el reclutamiento: crear búsquedas, mover pipeline, cargar candidatos. */
const RECRUITING_ROLES: OrgRole[] = ["owner", "admin", "recruiter"];

/** El consultor externo queda afuera: solo ve búsquedas asignadas, no gestiona. */
export function canManageRecruiting(role: OrgRole): boolean {
  return RECRUITING_ROLES.includes(role);
}
