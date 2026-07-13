import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { googleCalendarConnections } from "@/db/schema";

export async function upsertConnection(data: {
  organizationId: string;
  profileId: string;
  googleEmail: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .insert(googleCalendarConnections)
        .values(data)
        .onConflictDoUpdate({
          target: [
            googleCalendarConnections.organizationId,
            googleCalendarConnections.profileId,
          ],
          set: {
            googleEmail: data.googleEmail,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            expiresAt: data.expiresAt,
            updatedAt: new Date(),
          },
        }),
    "db.google-calendar.connection.upsert",
  );
}

export async function deleteConnection(
  profileId: string,
  organizationId: string,
): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .delete(googleCalendarConnections)
        .where(
          and(
            eq(googleCalendarConnections.profileId, profileId),
            eq(googleCalendarConnections.organizationId, organizationId),
          ),
        ),
    "db.google-calendar.connection.delete",
  );
}

/** Persiste el access token refrescado por el SDK de Google (evita reautenticar cada hora). */
export async function updateConnectionAccessToken(
  connectionId: string,
  data: { accessToken: string; expiresAt: Date },
): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(googleCalendarConnections)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(googleCalendarConnections.id, connectionId)),
    "db.google-calendar.connection.refresh-token",
  );
}
