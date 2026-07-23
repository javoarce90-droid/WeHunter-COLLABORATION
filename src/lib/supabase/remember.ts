/**
 * "Recordar mi cuenta": controla si la sesión de Supabase persiste al cerrar el navegador.
 * El login guarda la preferencia en esta cookie; el server client (server.ts) y el proxy la
 * respetan al setear/refrescar las cookies de auth.
 */
export const REMEMBER_COOKIE = "wh-remember";

/**
 * ¿La sesión debe persistir entre cierres del navegador? Default `true` — así las sesiones
 * ya existentes (sin el flag) y todo lo que no pasa por el login siguen siendo persistentes.
 * Solo el valor "0" (que setea el login cuando NO se tildó "recordarme") pide cookie de sesión.
 */
export function isRemembered(flag: string | undefined): boolean {
  return flag !== "0";
}
