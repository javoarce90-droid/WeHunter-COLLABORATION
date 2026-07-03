import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

const RECRUITER_PROTECTED_PREFIXES = [
  "/dashboard",
  "/jobs",
  "/talent",
  "/interviews",
  "/reports",
  "/onboarding",
];

const CANDIDATE_PROTECTED_PREFIXES = ["/c/profile", "/c/onboarding", "/portal"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  const isCandidateProtected = CANDIDATE_PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isRecruiterProtected = RECRUITER_PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

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
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
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
