import { Suspense } from "react";
import Link from "next/link";
import { getActiveMembership } from "@/lib/auth/session";
import { isAssignmentScoped } from "@/lib/auth/roles";
import {
  listCandidatesPage,
  getCandidateFilterMeta,
  type CandidateFilterKey,
} from "@/features/recruiter/candidates/data/candidates.queries";
import { listJobs } from "@/features/recruiter/jobs/data/jobs.queries";
import { CandidatesList } from "@/features/recruiter/candidates/ui/CandidatesList";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { parsePage, totalPages as calcTotalPages } from "@/lib/pagination";

const FILTER_KEYS: CandidateFilterKey[] = [
  "all",
  "active",
  "passive",
  "contacted",
  "archived",
  "duplicates",
];
function isCandidateFilterKey(
  value: string | undefined,
): value is CandidateFilterKey {
  return value !== undefined && (FILTER_KEYS as string[]).includes(value);
}

/** El shell (título + acción) pinta al instante; el listado se streamea. */
export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string; page?: string }>;
}) {
  const { filter: rawFilter, q, page: rawPage } = await searchParams;
  const filter: CandidateFilterKey = isCandidateFilterKey(rawFilter)
    ? rawFilter
    : "all";
  const query = q ?? "";
  const page = parsePage(rawPage);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-text">
            Candidatos
          </h1>
          <p className="text-sm text-muted">
            El pool de talento de tu workspace.
          </p>
        </div>
        <Link
          href="/candidates/new"
          className="inline-flex items-center justify-center rounded-[var(--radius)] bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Cargar candidato
        </Link>
      </div>

      <Suspense fallback={<ListSkeleton />}>
        <CandidatesSection filter={filter} query={query} page={page} />
      </Suspense>
    </div>
  );
}

async function CandidatesSection({
  filter,
  query,
  page,
}: {
  filter: CandidateFilterKey;
  query: string;
  page: number;
}) {
  const membership = await getActiveMembership();
  if (!membership) {
    return (
      <CandidatesList
        candidates={[]}
        jobs={[]}
        filter={filter}
        query={query}
        counts={EMPTY_COUNTS}
        duplicateIds={[]}
        page={1}
        totalPages={1}
      />
    );
  }

  const [{ candidates, total }, { counts, duplicateIds }, jobs] =
    await Promise.all([
      listCandidatesPage(membership.organizationId, filter, query, page),
      getCandidateFilterMeta(membership.organizationId),
      listJobs(
        membership.organizationId,
        isAssignmentScoped(membership.role) ? membership.id : undefined,
      ),
    ]);
  return (
    <CandidatesList
      candidates={candidates}
      jobs={jobs.map((j) => ({ id: j.id, title: j.title }))}
      filter={filter}
      query={query}
      counts={counts}
      duplicateIds={duplicateIds}
      page={page}
      totalPages={calcTotalPages(total)}
    />
  );
}

const EMPTY_COUNTS = {
  all: 0,
  active: 0,
  passive: 0,
  contacted: 0,
  archived: 0,
  duplicates: 0,
};
