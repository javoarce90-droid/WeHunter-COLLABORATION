import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { organizations, profiles } from "@/db/schema";

export interface ProfilePatch {
  fullName?: string;
  jobTitle?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
}

/** Actualiza el perfil del usuario actual. RLS: la política own_profile_update solo deja el propio. */
export async function updateOwnProfile(userId: string, patch: ProfilePatch): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(profiles)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(profiles.id, userId)),
    "db.settings.update-profile",
  );
}

export interface CareerSiteBranding {
  description?: string;
  primaryColor?: string;
  accentColor?: string;
  website?: string;
  social?: { linkedin?: string; instagram?: string; x?: string; facebook?: string };
}

export interface OrgPatch {
  name?: string;
  logoUrl?: string | null;
  careerSiteEnabled?: boolean;
  careerSiteCoverUrl?: string;
  careerSiteSettings?: CareerSiteBranding;
}

/** Actualiza el workspace. RLS: org_admin_can_update solo deja al owner/admin de esa org. */
export async function updateOrganization(organizationId: string, patch: OrgPatch): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(organizations)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(organizations.id, organizationId)),
    "db.settings.update-organization",
  );
}
