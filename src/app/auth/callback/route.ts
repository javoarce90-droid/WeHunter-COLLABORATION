import { headers, cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PICK_ACCOUNT_COOKIE, PICK_ACCOUNT_PATH } from "@/lib/auth/pick-account";

/**
 * Callback de auth compartido. Dos flujos que canjean un `code` por sesión (deja cookies):
 *  - Reset de contraseña (PKCE): viene con `next` (/reset-password | /c/reset-password), sin realm.
 *  - Login social OAuth: viene con `realm` (recruiter | candidate).
 *
 * En OAuth no existe la distinción entre "iniciar sesión" y "registrarse": si la cuenta no
 * existe, se crea. Por eso el `realm` (o sea, desde qué pantalla se hizo clic) NO decide el
 * tipo de cuenta: un candidato que entra por el botón de la landing del reclutador quedaría
 * registrado como reclutador sin que nada se lo pregunte. Al usuario nuevo lo mandamos a
 * elegir explícitamente; el que ya existía entra a donde le corresponde POR SU CUENTA, no por
 * la pantalla desde la que entró.
 *
 * Ruta pública: no está en los prefijos protegidos de route-realms, el proxy la deja pasar.
 */

const RESET_PATHS = new Set(["/reset-password", "/c/reset-password"]);
const REALM_HOME = { recruiter: "/dashboard", candidate: "/portal" } as const;
type Realm = keyof typeof REALM_HOME;

function isRealm(v: string | null): v is Realm {
  return v === "recruiter" || v === "candidate";
}
function loginFor(realm: Realm): string {
  return realm === "candidate" ? "/c/login" : "/login";
}
function forgotFor(next: string): string {
  return next.startsWith("/c/") ? "/c/forgot-password" : "/forgot-password";
}

/** Usuario recién creado: en su primera sesión, last_sign_in_at ≈ created_at (misma request). */
function isNewUser(user: { created_at: string; last_sign_in_at?: string | null }): boolean {
  const created = Date.parse(user.created_at);
  const lastSignIn = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : created;
  return lastSignIn - created < 10_000;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const providerError = url.searchParams.get("error");
  const realm: Realm | null = isRealm(url.searchParams.get("realm"))
    ? (url.searchParams.get("realm") as Realm)
    : null;
  const nextRaw = url.searchParams.get("next") ?? "/reset-password";
  // Whitelist: el `next` del reset solo puede ser una pantalla de reset (evita open redirect).
  const next = RESET_PATHS.has(nextRaw) ? nextRaw : "/reset-password";

  const reqHeaders = await headers();
  const host = reqHeaders.get("host") ?? "";
  const proto = reqHeaders.get("x-forwarded-proto") ?? "http";
  const appUrl = host ? `${proto}://${host}` : url.origin;

  const failUrl = realm
    ? `${appUrl}${loginFor(realm)}?error=oauth`
    : `${appUrl}${forgotFor(next)}?error=expired`;

  // El proveedor OAuth puede volver con error (usuario canceló, o provider sin configurar).
  if (providerError || !code) {
    return NextResponse.redirect(failUrl);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(failUrl);
  }

  if (realm) {
    if (data.user && isNewUser(data.user)) {
      // La cookie es la que habilita la pantalla de elección: sin ella no se puede entrar a
      // cambiarse el tipo de cuenta más tarde. Efímera y httpOnly.
      (await cookies()).set(PICK_ACCOUNT_COOKIE, realm, {
        httpOnly: true,
        secure: proto === "https",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 15,
      });
      return NextResponse.redirect(`${appUrl}${PICK_ACCOUNT_PATH}`);
    }

    // Usuario existente: manda su tipo de cuenta real, no el reino de la pantalla usada.
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_type")
      .eq("id", data.user?.id ?? "")
      .maybeSingle();
    const home = profile?.account_type === "recruiter" ? REALM_HOME.recruiter : REALM_HOME.candidate;
    return NextResponse.redirect(`${appUrl}${home}`);
  }

  return NextResponse.redirect(`${appUrl}${next}`);
}
