import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { googleCalendarConnections } from "@/db/schema";

/** Conexión OAuth de un recruiter con su Google Calendar. Cliente RLS: own_connection. */
export type GoogleCalendarConnection = {
  id: string;
  organizationId: string;
  profileId: string;
  googleEmail: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
};

export async function getConnectionByProfile(
  profileId: string,
  organizationId: string,
): Promise<GoogleCalendarConnection | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select()
        .from(googleCalendarConnections)
        .where(
          and(
            eq(googleCalendarConnections.profileId, profileId),
            eq(googleCalendarConnections.organizationId, organizationId),
          ),
        )
        .limit(1),
    "db.google-calendar.connection.get",
  );
  return rows[0] ?? null;
}
