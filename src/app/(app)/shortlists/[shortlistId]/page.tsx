import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getActiveMembership } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import {
  getSharedShortlistForMembership,
  listShortlistCandidates,
} from "@/features/recruiter/shortlists/data/shortlists.queries";
import { FeedbackFormInterno } from "@/features/recruiter/shortlists/ui/FeedbackFormInterno";
import { STAGE_LABELS } from "@/features/recruiter/applications/schema";
import type { ApplicationStage } from "@/features/recruiter/applications/schema";

interface Props {
  params: Promise<{ shortlistId: string }>;
}

/** Detalle de una shortlist compartida con el Hiring Manager — mismo contenido que ve un
 *  Cliente externo por link mágico (`SharedShortlistView`), pero autenticado: sin CV (esa
 *  ruta es por token) ni pedido de entrevista, solo feedback por candidato en esta pasada. */
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
          {candidates.length} candidato{candidates.length !== 1 ? "s" : ""}. Dejá tu feedback en
          cada uno.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {candidates.map((c) => (
          <Card key={c.shortlistCandidateId}>
            <div className="flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-text">{c.fullName}</h2>
                  {c.email && <p className="truncate text-sm text-muted">{c.email}</p>}
                </div>
                <Badge variant={c.stage as ApplicationStage}>
                  {STAGE_LABELS[c.stage as ApplicationStage]}
                </Badge>
              </div>

              <FeedbackFormInterno
                shortlistId={shortlistId}
                shortlistCandidateId={c.shortlistCandidateId}
                currentDecision={c.feedbackDecision}
                currentComment={c.feedbackComment}
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
