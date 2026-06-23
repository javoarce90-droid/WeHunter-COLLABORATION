import { Suspense } from "react";
import Link from "next/link";
import { getActiveMembership } from "@/lib/auth/session";
import { listJobs } from "@/features/recruiter/jobs/data/jobs.queries";
import { JobsList } from "@/features/recruiter/jobs/ui/JobsList";
import { ListSkeleton } from "@/components/ui/list-skeleton";

/** El shell (título + acción) pinta al instante; el listado se streamea. */
export default function JobsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-text">Búsquedas</h1>
          <p className="text-sm text-muted">Gestioná tus avisos y su pipeline.</p>
        </div>
        <Link
          href="/jobs/new"
          className="inline-flex items-center justify-center rounded-[var(--radius)] bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Crear búsqueda
        </Link>
      </div>

      <Suspense fallback={<ListSkeleton />}>
        <JobsSection />
      </Suspense>
    </div>
  );
}

async function JobsSection() {
  const membership = await getActiveMembership();
  const jobs = membership ? await listJobs(membership.organizationId) : [];
  return <JobsList jobs={jobs} />;
}
