import { NextResponse } from "next/server";
import { getActiveMembership } from "@/lib/auth/session";
import { getOrganization } from "@/features/recruiter/settings/data/settings.queries";
import { getOrgLogoSignedUrl } from "@/features/recruiter/settings/data/settings.storage";

/**
 * Sirve el logo del workspace activo: resuelve un signed URL fresco (bucket privado) y redirige.
 * RLS en getOrganization garantiza que solo se sirve el logo de una org del usuario.
 */
export async function GET() {
  const membership = await getActiveMembership();
  if (!membership) return new NextResponse("No autorizado", { status: 401 });

  const org = await getOrganization(membership.organizationId);
  if (!org?.logoUrl) return new NextResponse("No encontrado", { status: 404 });

  const url = await getOrgLogoSignedUrl(org.logoUrl);
  if (!url) return new NextResponse("Logo no disponible", { status: 404 });

  return NextResponse.redirect(url);
}
