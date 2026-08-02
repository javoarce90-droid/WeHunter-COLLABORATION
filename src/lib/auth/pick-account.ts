/**
 * Elección de tipo de cuenta para altas sociales. Constantes compartidas entre el callback
 * de OAuth (que la habilita) y la pantalla + action que la resuelven.
 *
 * La cookie es un permiso de un solo uso: solo la escribe el callback cuando detecta un
 * usuario recién creado, y la borra la action al elegir. Es una guarda de UX, no de
 * seguridad — la política RLS `own_profile_update` permite a cualquier usuario actualizar su
 * propia fila de `profiles`, así que el tipo de cuenta es auto-modificable por API. Eso no
 * cruza tenants (todo el acceso está scopeado por membership), pero conviene saberlo.
 */

export const PICK_ACCOUNT_COOKIE = "wh.auth.pick_account";
export const PICK_ACCOUNT_PATH = "/elegir-cuenta";
