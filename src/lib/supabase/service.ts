import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase con SERVICE ROLE. Bypassea RLS (incluido el de Storage).
 *
 * USO ESTRICTO Y CONTROLADO — solo server-side, nunca importar desde código cliente:
 *  - Firmar CVs del bucket privado para la vista pública de shortlist, donde el actor
 *    (empresa) NO tiene sesión y por lo tanto no puede firmar con su propio JWT.
 *  - `auth.admin.createUser` al aceptar una invitación de equipo (`team/data/team.mutations.ts`):
 *    quien acepta todavía no tiene cuenta ni sesión — la posesión del token de la invitación
 *    (validado antes, vía el cliente `admin` de Drizzle) es la autorización.
 *
 * La autorización NO la da este cliente: la da SIEMPRE una credencial validada antes de
 * llegar acá (el token del shortlist_share, o el token de la invitación). Este cliente solo
 * materializa la acción una vez que esa credencial ya fue validada.
 */
export function createSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
