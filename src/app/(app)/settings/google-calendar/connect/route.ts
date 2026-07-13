import { randomBytes } from "node:crypto";
import { headers, cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getActiveMembership } from "@/lib/auth/session";
import {
  getOAuth2Client,
  GOOGLE_CALENDAR_SCOPES,
} from "@/features/recruiter/google-calendar/data/oauth-client";

const STATE_COOKIE = "wh.gcal.oauth_state";

/** Arranca el flow OAuth: genera un state anti-CSRF y redirige al consent de Google. */
export async function GET() {
  const membership = await getActiveMembership();
  if (!membership) return new NextResponse("No autorizado", { status: 401 });

  const reqHeaders = await headers();
  const host = reqHeaders.get("host") ?? "";
  const proto = reqHeaders.get("x-forwarded-proto") ?? "http";
  const appUrl = host ? `${proto}://${host}` : "";

  const client = getOAuth2Client(appUrl);
  if (!client) {
    return NextResponse.redirect(`${appUrl}/settings?google_calendar=not_configured`);
  }

  const state = randomBytes(16).toString("hex");
  (await cookies()).set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600, // 10 min: alcanza para completar el consent de Google.
    path: "/settings/google-calendar",
  });

  const authUrl = client.generateAuthUrl({
    access_type: "offline", // necesario para recibir refresh_token
    prompt: "consent", // fuerza a reemitir el refresh_token aunque ya haya conectado antes
    scope: GOOGLE_CALENDAR_SCOPES,
    state,
  });

  return NextResponse.redirect(authUrl);
}
