import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase con SERVICE ROLE. Bypassea RLS (incluido el de Storage).
 *
 * USO ESTRICTO Y CONTROLADO — solo server-side, nunca importar desde código cliente:
 *  - Firmar CVs del bucket privado para la vista pública de shortlist, donde el actor
 *    (empresa) NO tiene sesión y por lo tanto no puede firmar con su propio JWT.
 *
 * La autorización NO la da este cliente: la da SIEMPRE el token del shortlist_share,
 * validado por la función SECURITY DEFINER antes de llegar acá. Este cliente solo
 * materializa el acceso a Storage una vez que el token ya fue validado.
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
