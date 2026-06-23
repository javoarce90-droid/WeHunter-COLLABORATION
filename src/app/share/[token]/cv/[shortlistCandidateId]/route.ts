import { NextResponse } from "next/server";
import { getSharedCvSignedUrl } from "@/features/company/shortlist-review/data/shortlist-review.data";

interface Context {
  params: Promise<{ token: string; shortlistCandidateId: string }>;
}

// Sirve el CV de un candidato compartido. La validación del token + pertenencia ocurre
// dentro de getSharedCvSignedUrl (que solo firma si el candidato pertenece al shortlist
// del token). Si no corresponde, 404 sin filtrar información.
export async function GET(_req: Request, { params }: Context) {
  const { token, shortlistCandidateId } = await params;

  const signedUrl = await getSharedCvSignedUrl(token, shortlistCandidateId);
  if (!signedUrl) {
    return new NextResponse("No disponible", { status: 404 });
  }

  return NextResponse.redirect(signedUrl);
}
