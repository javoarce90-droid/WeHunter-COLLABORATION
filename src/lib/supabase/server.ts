import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente Supabase para código de servidor (Server Components, Server Actions,
 * route handlers). Lee/escribe la sesión en las cookies de la request.
 *
 * Para queries de datos usá el cliente Drizzle con RLS (`getDb()` de @/db/client).
 * Este cliente es para Auth (login, sesión, usuario actual).
 *
 * `rememberMe` (default true): si es false, las cookies de auth se setean SIN maxAge/expires,
 * o sea como cookies de SESIÓN — se borran al cerrar el navegador ("no recordar mi cuenta").
 * Solo el login lo pasa explícito; el resto usa el default (persistente).
 */
export async function createSupabaseServerClient(rememberMe = true) {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (
          cookiesToSet: {
            name: string;
            value: string;
            options?: Parameters<typeof cookieStore.set>[2];
          }[],
        ) => {
          // En Server Components no se pueden setear cookies; el refresco de sesión
          // lo hace el middleware. Ignoramos el error en ese contexto.
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Sin "recordarme": cookie de sesión (sin maxAge/expires). No tocamos las
              // cookies de borrado (value vacío) para no romper el signOut.
              const opts =
                rememberMe || !value
                  ? options
                  : { ...options, maxAge: undefined, expires: undefined };
              cookieStore.set(name, value, opts);
            });
          } catch {
            // llamado desde un Server Component sin response mutable — ok.
          }
        },
      },
    },
  );
}
