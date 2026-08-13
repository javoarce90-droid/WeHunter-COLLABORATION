import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import {
  getSharedShortlistForMembership,
  listShortlistCandidates,
} from "@/features/recruiter/shortlists/data/shortlists.queries";
import { HmShortlistCandidateList } from "@/features/recruiter/shortlists/ui/HmShortlistCandidateList";

interface Props {
  params: Promise<{ shortlistId: string }>;
}

/** Detalle de una shortlist compartida con el Hiring Manager — mismo sheet de detalle
 *  unificado que ve el Cliente externo por link mágico (perfil, CV, entrevistas,
 *  comentarios de Recruiting), pero autenticado por sesión en vez de token. */
export default async function SharedShortlistDetailPage({ params }: Props) {
  const { shortlistId } = await params;
  const membership = await getActiveMembership();
  if (!membership || !can(membership.role, "shortlists.feedback")) notFound();

  const shortlist = await getSharedShortlistForMembership(
    shortlistId,
    membership.id,
    membership.organizationId,
  );
  if (!shortlist) notFound();

  const candidates = await listShortlistCandidates(shortlistId, membership.organizationId);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/shortlists" className="text-xs font-semibold text-muted hover:text-text">
          ← Volver a Shortlists compartidas
        </Link>
        <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-label">
          {shortlist.jobTitle}
        </span>
        <h1 className="font-display text-xl font-bold text-text">{shortlist.name}</h1>
        <p className="mt-0.5 text-sm text-muted">
          {candidates.length} candidato{candidates.length !== 1 ? "s" : ""}. Abrí cada uno para
          ver su perfil completo y dejar tu feedback.
        </p>
      </div>

      <HmShortlistCandidateList
        shortlistId={shortlistId}
        jobTitle={shortlist.jobTitle}
        candidates={candidates}
      />
    </div>
  );
}
