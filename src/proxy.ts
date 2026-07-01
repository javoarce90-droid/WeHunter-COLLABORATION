import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { MOCK_SESSION_COOKIE } from "./features/candidate/profile/schema";

/**
 * Proxy de sesión (en Next 16 reemplaza a `middleware.ts`).
 *  1. Refresca las cookies de la sesión de Supabase en cada request (REQUERIDO por
 *     @supabase/ssr: sin esto la sesión expira en server components).
 *  2. Protege las rutas del reclutador: sin sesión, redirige a /login.
 *
 * No hace autorización por rol (eso vive en el dominio de cada feature). Acá solo
 * "estás logueado o no".
 */

const RECRUITER_PROTECTED_PREFIXES = [
  "/dashboard",
  "/jobs",
  "/talent",
  "/interviews",
  "/reports",
  "/onboarding",
];

const CANDIDATE_PROTECTED_PREFIXES = ["/c/profile", "/portal"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  // 1. Manejo del flujo de Candidatos (UI-Only Mock)
  const isCandidateProtected = CANDIDATE_PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isCandidateProtected) {
    const hasMockSession = request.cookies.has(MOCK_SESSION_COOKIE);
    if (!hasMockSession) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/c/login";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Si tiene la cookie mockeada, lo dejamos pasar sin tocar Supabase.
    return response;
  }

  // 2. Manejo del flujo de Reclutadores (Supabase Real)
  const isRecruiterProtected = RECRUITER_PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
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

  return response;
}

export const config = {
  // Corre en todo menos assets estáticos y la API de imágenes de Next.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
