/** Días que un perfil ya obtenido de un `SourcingProvider` se considera vigente antes de
 *  volver a pedirlo — control interno "no pagar dos veces" (ver
 *  `openspec/changes/integrar-harvestapi-sourcing/design.md` §6.2). Punto medio del rango
 *  30–60 días confirmado por el usuario (proposal.md §3.2) — configuración, no un límite de
 *  negocio fijo; cambiarlo no requiere tocar la lógica de la query. */
export const SOURCING_PROFILE_CACHE_TTL_DAYS = 45;
