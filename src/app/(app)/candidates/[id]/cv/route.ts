import { NextResponse } from "next/server";
import { getActiveMembership } from "@/lib/auth/session";
import { getCandidateById } from "@/features/recruiter/candidates/data/candidates.queries";
import { getCvSignedUrl } from "@/features/recruiter/candidates/data/candidates.storage";

/**
 * Sirve el CV de un candidato: resuelve un signed URL fresco (bucket privado) y redirige.
 * La pertenencia a la org se garantiza vía RLS en getCandidateById, así que no se puede
 * acceder al CV de un candidato de otro tenant.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const membership = await getActiveMembership();
  if (!membership) {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const candidate = await getCandidateById(id, membership.organizationId);
  if (!candidate?.cvUrl) {
    return new NextResponse("No encontrado", { status: 404 });
  }

  const url = await getCvSignedUrl(candidate.cvUrl);
  if (!url) {
    return new NextResponse("CV no disponible", { status: 404 });
  }

  return NextResponse.redirect(url);
}
