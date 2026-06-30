import { NextResponse } from "next/server";
import { getActiveMembership } from "@/lib/auth/session";
import { getOwnProfile } from "@/features/recruiter/settings/data/settings.queries";
import { getAvatarSignedUrl } from "@/features/recruiter/settings/data/settings.storage";

/**
 * Sirve el avatar del usuario actual: resuelve un signed URL fresco (bucket privado) y redirige.
 * RLS en getOwnProfile garantiza que solo se sirve el avatar del propio usuario.
 */
export async function GET() {
  const membership = await getActiveMembership();
  if (!membership) return new NextResponse("No autorizado", { status: 401 });

  const profile = await getOwnProfile();
  if (!profile?.avatarUrl) return new NextResponse("No encontrado", { status: 404 });

  const url = await getAvatarSignedUrl(profile.avatarUrl);
  if (!url) return new NextResponse("Avatar no disponible", { status: 404 });

  return NextResponse.redirect(url);
}
