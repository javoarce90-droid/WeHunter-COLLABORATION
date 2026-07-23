import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isCandidateRoute, isRecruiterRoute } from "@/lib/auth/route-realms";
import { isRemembered, REMEMBER_COOKIE } from "@/lib/supabase/remember";

/**
 * Proxy de sesión (en Next 16 reemplaza a `middleware.ts`).
 *  1. Refresca las cookies de la sesión de Supabase en cada request (REQUERIDO por
 *     @supabase/ssr: sin esto la sesión expira en server components).
 *  2. Protege las rutas del reclutador y las del candidato: sin sesión, redirige al login
 *     que corresponda.
 *
 * No hace autorización por rol (eso vive en el dominio de cada feature). Acá solo
 * "estás logueado o no". Mismo Supabase Auth para los dos — no hay cookie mock.
 */

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  const isCandidateProtected = isCandidateRoute(pathname);
  const isRecruiterProtected = isRecruiterRoute(pathname);

  // "Recordar mi cuenta": si el usuario no lo tildó, mantenemos las cookies de auth como
  // cookies de sesión también al refrescarlas acá (si no, el refresco las volvería persistentes).
  const rememberMe = isRemembered(request.cookies.get(REMEMBER_COOKIE)?.value);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            const opts =
              rememberMe || !value
                ? options
                : { ...options, maxAge: undefined, expires: undefined };
            response.cookies.set(name, value, opts);
          });
        },
      },
    }
  );

  // getUser() revalida el token contra Supabase y dispara el refresco de cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isRecruiterProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isCandidateProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/c/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // Corre en todo menos assets estáticos y la API de imágenes de Next.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
