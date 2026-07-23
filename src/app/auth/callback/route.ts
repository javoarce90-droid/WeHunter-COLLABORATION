import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Callback de auth compartido. Dos flujos que canjean un `code` por sesión (deja cookies):
 *  - Reset de contraseña (PKCE): viene con `next` (/reset-password | /c/reset-password), sin realm.
 *  - Login social OAuth: viene con `realm` (recruiter | candidate). Al usuario NUEVO del reino
 *    recruiter le fijamos account_type='recruiter' (el default de handle_new_user es 'candidate',
 *    porque OAuth no manda el metadata del signUp). Los layouts rutean por account_type, así que
 *    si ese update falla lo mandamos al login, no al reino equivocado.
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
    // Reino recruiter: el usuario nuevo hay que marcarlo 'recruiter' (OAuth no manda el metadata
    // del signUp, así que handle_new_user lo dejó 'candidate'). El guard de "usuario nuevo" evita
    // pisar el tipo de un candidato ya existente que entre por el botón del reino recruiter.
    if (realm === "recruiter" && data.user && isNewUser(data.user)) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ account_type: "recruiter" })
        .eq("id", data.user.id);
      if (updateError) {
        return NextResponse.redirect(failUrl);
      }
    }
    return NextResponse.redirect(`${appUrl}${REALM_HOME[realm]}`);
  }

  return NextResponse.redirect(`${appUrl}${next}`);
}
