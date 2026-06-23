import Link from "next/link";
import { getActiveMembership } from "@/lib/auth/session";
import { listCandidates } from "@/features/recruiter/candidates/data/candidates.queries";
import { CandidatesList } from "@/features/recruiter/candidates/ui/CandidatesList";

export default async function CandidatesPage() {
  const membership = await getActiveMembership();
  const candidates = membership
    ? await listCandidates(membership.organizationId)
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-text">Candidatos</h1>
          <p className="text-sm text-muted">El pool de talento de tu workspace.</p>
        </div>
        <Link
          href="/candidates/new"
          className="inline-flex items-center justify-center rounded-[var(--radius)] bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Cargar candidato
        </Link>
      </div>

      <CandidatesList candidates={candidates} />
    </div>
  );
}
