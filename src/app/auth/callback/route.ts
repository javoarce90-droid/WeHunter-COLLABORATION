import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Callback del flujo PKCE de Supabase (link de recovery de contraseña). Canjea el `code` del
 * email por una sesión (deja las cookies) y manda a la pantalla de nueva contraseña. Si falla
 * (link vencido o ya usado), vuelve a "Olvidé mi contraseña" con el aviso.
 *
 * Ruta pública: no está en los prefijos protegidos de route-realms, así que el proxy la deja
 * pasar sin sesión (que es justamente el caso de quien olvidó la clave).
 */

const RESET_PATHS = new Set(["/reset-password", "/c/reset-password"]);

function forgotFor(next: string): string {
  return next.startsWith("/c/") ? "/c/forgot-password" : "/forgot-password";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next") ?? "/reset-password";
  // Whitelist: el `next` solo puede ser una de las pantallas de reset (evita open redirect).
  const next = RESET_PATHS.has(nextRaw) ? nextRaw : "/reset-password";

  const reqHeaders = await headers();
  const host = reqHeaders.get("host") ?? "";
  const proto = reqHeaders.get("x-forwarded-proto") ?? "http";
  const appUrl = host ? `${proto}://${host}` : url.origin;

  if (!code) {
    return NextResponse.redirect(`${appUrl}${forgotFor(next)}?error=expired`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${appUrl}${forgotFor(next)}?error=expired`);
  }

  return NextResponse.redirect(`${appUrl}${next}`);
}
