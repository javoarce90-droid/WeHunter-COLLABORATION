import { google } from "googleapis";
import { headers, cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCurrentUser, getActiveMembership } from "@/lib/auth/session";
import { getOAuth2Client } from "@/features/recruiter/google-calendar/data/oauth-client";
import { guardarConexion } from "@/features/recruiter/google-calendar/domain/guardar-conexion";
import { upsertConnection } from "@/features/recruiter/google-calendar/data/connections.mutations";

const STATE_COOKIE = "wh.gcal.oauth_state";

export async function GET(request: Request) {
  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!user || !membership) return new NextResponse("No autorizado", { status: 401 });

  const reqHeaders = await headers();
  const host = reqHeaders.get("host") ?? "";
  const proto = reqHeaders.get("x-forwarded-proto") ?? "http";
  const appUrl = host ? `${proto}://${host}` : "";
  const settingsUrl = `${appUrl}/settings`;

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${settingsUrl}?google_calendar=error`);
  }

  const client = getOAuth2Client(appUrl);
  if (!client) {
    return NextResponse.redirect(`${settingsUrl}?google_calendar=not_configured`);
  }

  try {
    const { tokens } = await client.getToken(code);
    if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
      // Sin refresh_token: Google solo lo emite en el primer consent ("prompt=consent" ya lo
      // fuerza, pero si el usuario venía de un estado raro, mejor pedirle que reintente).
      return NextResponse.redirect(`${settingsUrl}?google_calendar=error`);
    }

    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ auth: client, version: "v2" });
    const { data: userinfo } = await oauth2.userinfo.get();
    if (!userinfo.email) {
      return NextResponse.redirect(`${settingsUrl}?google_calendar=error`);
    }

    const result = await guardarConexion(
      {
        organizationId: membership.organizationId,
        profileId: user.id,
        googleEmail: userinfo.email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(tokens.expiry_date),
      },
      { upsertConnection },
    );

    if (!result.ok) {
      return NextResponse.redirect(`${settingsUrl}?google_calendar=error`);
    }

    return NextResponse.redirect(`${settingsUrl}?google_calendar=connected`);
  } catch {
    return NextResponse.redirect(`${settingsUrl}?google_calendar=error`);
  }
}
