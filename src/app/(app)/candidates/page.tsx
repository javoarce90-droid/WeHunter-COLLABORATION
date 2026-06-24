import { Suspense } from "react";
import Link from "next/link";
import { getActiveMembership } from "@/lib/auth/session";
import { listCandidates } from "@/features/recruiter/candidates/data/candidates.queries";
import { listJobs } from "@/features/recruiter/jobs/data/jobs.queries";
import { CandidatesList } from "@/features/recruiter/candidates/ui/CandidatesList";
import { ListSkeleton } from "@/components/ui/list-skeleton";

/** El shell (título + acción) pinta al instante; el listado se streamea. */
export default function CandidatesPage() {
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

      <Suspense fallback={<ListSkeleton />}>
        <CandidatesSection />
      </Suspense>
    </div>
  );
}

async function CandidatesSection() {
  const membership = await getActiveMembership();
  if (!membership) return <CandidatesList candidates={[]} jobs={[]} />;

  // Candidatos + búsquedas (para la acción masiva "postular a búsqueda") en paralelo.
  const [candidates, jobs] = await Promise.all([
    listCandidates(membership.organizationId),
    listJobs(membership.organizationId),
  ]);
  return (
    <CandidatesList
      candidates={candidates}
      jobs={jobs.map((j) => ({ id: j.id, title: j.title }))}
    />
  );
}
