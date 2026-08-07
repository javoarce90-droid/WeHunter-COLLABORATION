import { Suspense } from "react";
import Link from "next/link";
import { getActiveMembership } from "@/lib/auth/session";
import { can, isAssignmentScoped } from "@/lib/auth/roles";
import {
  listJobsWithStats,
  countJobsByStatus,
  getOrganizationSlug,
} from "@/features/recruiter/jobs/data/jobs.queries";
import { JobsList } from "@/features/recruiter/jobs/ui/JobsList";
import {
  isJobFilter,
  isJobSortKey,
  DEFAULT_JOB_SORT,
  type JobFilter,
  type JobSortKey,
} from "@/features/recruiter/jobs/ui/job-filters";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { ToastOnMount } from "@/components/ui/toast-on-mount";
import { parsePage, totalPages as calcTotalPages } from "@/lib/pagination";

/** El shell (título + acción) pinta al instante; el listado se streamea. */
export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    page?: string;
    sort?: string;
  }>;
}) {
  const { status, q, page: rawPage, sort: rawSort } = await searchParams;
  const filter: JobFilter = isJobFilter(status) ? status : "all";
  const query = q ?? "";
  const page = parsePage(rawPage);
  const sort: JobSortKey = isJobSortKey(rawSort) ? rawSort : DEFAULT_JOB_SORT;
  const membership = await getActiveMembership();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-text">
            Búsquedas
          </h1>
          <p className="text-sm text-muted">
            Gestioná tus avisos y su pipeline.
          </p>
        </div>
        {membership && can(membership.role, "jobs.manage") && (
          <Link
            href="/jobs/new"
            className={buttonVariants({ variant: "primary" })}
          >
            Crear búsqueda
          </Link>
        )}
      </div>

      <Suspense fallback={null}>
        <ToastOnMount
          param="updated"
          message="Cambios guardados en la búsqueda"
        />
      </Suspense>

      <Suspense fallback={<ListSkeleton />}>
        <JobsSection filter={filter} query={query} page={page} sort={sort} />
      </Suspense>
    </div>
  );
}

async function JobsSection({
  filter,
  query,
  page,
  sort,
}: {
  filter: JobFilter;
  query: string;
  page: number;
  sort: JobSortKey;
}) {
  const membership = await getActiveMembership();
  if (!membership) {
    return (
      <JobsList
        jobs={[]}
        filter={filter}
        query={query}
        counts={EMPTY_COUNTS}
        page={1}
        totalPages={1}
        sort={sort}
        orgSlug={null}
        canManage={false}
      />
    );
  }

  const scopeToMembershipId = isAssignmentScoped(membership.role)
    ? membership.id
    : undefined;
  const [{ jobs, total }, counts, orgSlug] = await Promise.all([
    listJobsWithStats(
      membership.organizationId,
      scopeToMembershipId,
      filter,
      query,
      page,
      sort,
    ),
    countJobsByStatus(membership.organizationId, scopeToMembershipId),
    getOrganizationSlug(membership.organizationId),
  ]);
  return (
    <JobsList
      jobs={jobs}
      filter={filter}
      query={query}
      counts={counts}
      page={page}
      totalPages={calcTotalPages(total)}
      sort={sort}
      orgSlug={orgSlug}
      canManage={can(membership.role, "jobs.manage")}
    />
  );
}

const EMPTY_COUNTS = {
  all: 0,
  open: 0,
  paused: 0,
  draft: 0,
  closed: 0,
  archived: 0,
};
