import { sql } from "drizzle-orm";
import { admin } from "@/db/client";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { AVATARS_BUCKET } from "@/features/recruiter/settings/data/settings.storage";

/**
 * Acceso público (visitante SIN sesión) a la Comunidad de WeHunter. Mismo patrón que
 * career-site.data.ts: toda la autorización vive en get_community_profiles (SECURITY DEFINER,
 * migración 0093), que solo expone perfiles con visibleInCommunity=true. Se invoca con el
 * cliente admin porque no hay usuario autenticado.
 */

const AVATAR_SIGNED_URL_TTL_SECONDS = 60 * 10; // 10 min; se regenera en cada request (force-dynamic)

export type RawCommunityProfile = {
  id: string;
  fullName: string | null;
  avatarUrl: string | null; // path crudo del bucket privado `avatars`
  jobTitle: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  phone: string | null;
  organizationName: string;
  organizationSlug: string | null; // null si el career site de esa org no está habilitado
};

export type CommunityProfile = Omit<RawCommunityProfile, "avatarUrl"> & {
  avatarUrl: string | null; // signed URL, ya resuelta
};

async function getAvatarSignedUrl(path: string): Promise<string | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.storage
    .from(AVATARS_BUCKET)
    .createSignedUrl(path, AVATAR_SIGNED_URL_TTL_SECONDS);
  if (error) return null;
  return data.signedUrl;
}

export async function getCommunityProfiles(): Promise<CommunityProfile[]> {
  const rows = await admin.execute<{ result: RawCommunityProfile[] }>(
    sql`select get_community_profiles() as result`,
  );
  const raw = rows[0]?.result ?? [];

  return Promise.all(
    raw.map(async (profile) => ({
      ...profile,
      avatarUrl: profile.avatarUrl ? await getAvatarSignedUrl(profile.avatarUrl) : null,
    })),
  );
}
