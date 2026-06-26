import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { organizations, profiles } from "@/db/schema";

export interface OwnProfile {
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  phone: string | null;
  location: string | null;
  linkedinUrl: string | null;
  bio: string | null;
  createdAt: Date; // "miembro desde"
}

/** Perfil (extendido) del usuario actual (RLS: solo el propio). */
export async function getOwnProfile(): Promise<OwnProfile | null> {
  const db = await getDb();
  if (!db.userId) return null;
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          fullName: profiles.fullName,
          email: profiles.email,
          avatarUrl: profiles.avatarUrl,
          jobTitle: profiles.jobTitle,
          phone: profiles.phone,
          location: profiles.location,
          linkedinUrl: profiles.linkedinUrl,
          bio: profiles.bio,
          createdAt: profiles.createdAt,
        })
        .from(profiles)
        .where(eq(profiles.id, db.userId!))
        .limit(1),
    "db.settings.own-profile",
  );
  return rows[0] ?? null;
}

export interface OrgSettings {
  id: string;
  name: string;
  logoUrl: string | null;
  preferences: { timezone?: string } | null;
}

/** Datos del workspace activo (RLS: solo orgs del usuario). */
export async function getOrganization(organizationId: string): Promise<OrgSettings | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          id: organizations.id,
          name: organizations.name,
          logoUrl: organizations.logoUrl,
          preferences: organizations.preferences,
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1),
    "db.settings.organization",
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logoUrl,
    preferences: (row.preferences as { timezone?: string } | null) ?? null,
  };
}
