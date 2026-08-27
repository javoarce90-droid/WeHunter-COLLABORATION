import { Suspense } from "react";
import Link from "next/link";
import { getActiveMembership } from "@/lib/auth/session";
import { isAssignmentScoped } from "@/lib/auth/roles";
import {
  listCandidatesPage,
  getCandidateFilterMeta,
  getResumeCountsForCandidates,
  completenessForCandidate,
  type CandidateFilterKey,
  type CandidateCompleteness,
  type CompletenessFilter,
} from "@/features/recruiter/candidates/data/candidates.queries";
import { listJobs } from "@/features/recruiter/jobs/data/jobs.queries";
import { CandidatesList } from "@/features/recruiter/candidates/ui/CandidatesList";
import { SparkleIcon } from "@/components/ui/ai";
import {
  isCandidateSeniority,
  isCompletenessFilter,
} from "@/features/recruiter/candidates/ui/candidate-filters";
import type { JobSeniority } from "@/features/recruiter/jobs/domain/job-details";
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
  searchParams: Promise<{
    filter?: string;
    q?: string;
    page?: string;
    seniority?: string;
    skill?: string;
    completeness?: string;
  }>;
}) {
  const {
    filter: rawFilter,
    q,
    page: rawPage,
    seniority: rawSeniority,
    skill: rawSkill,
    completeness: rawCompleteness,
  } = await searchParams;
  const filter: CandidateFilterKey = isCandidateFilterKey(rawFilter)
    ? rawFilter
    : "all";
  const query = q ?? "";
  const page = parsePage(rawPage);
  const seniority: JobSeniority | undefined = isCandidateSeniority(rawSeniority)
    ? rawSeniority
    : undefined;
  const skill = rawSkill?.trim() ?? "";
  const completeness: CompletenessFilter | undefined = isCompletenessFilter(rawCompleteness)
    ? rawCompleteness
    : undefined;

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
        <div className="flex items-center gap-2">
          <Link
            href="/candidates/import"
            className="inline-flex items-center justify-center rounded-[var(--radius)] border border-border bg-surface px-4 py-3 text-sm font-semibold text-text transition-colors hover:bg-bg"
          >
            Importar desde archivo
          </Link>
          <Link
            href="/candidates/new"
            className="inline-flex items-center justify-center rounded-[var(--radius)] border border-border bg-surface px-4 py-3 text-sm font-semibold text-text transition-colors hover:bg-bg"
          >
            Cargar a mano
          </Link>
          <Link
            href="/candidates/new/ia"
            className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius)] bg-gradient-to-r from-primary to-[#7C3AED] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <SparkleIcon size={14} />
            Crear con IA
          </Link>
        </div>
      </div>

      <Suspense fallback={<ListSkeleton />}>
        <CandidatesSection
          filter={filter}
          query={query}
          page={page}
          seniority={seniority}
          skill={skill}
          completeness={completeness}
        />
      </Suspense>
    </div>
  );
}

async function CandidatesSection({
  filter,
  query,
  page,
  seniority,
  skill,
  completeness,
}: {
  filter: CandidateFilterKey;
  query: string;
  page: number;
  seniority?: JobSeniority;
  skill: string;
  completeness?: CompletenessFilter;
}) {
  const membership = await getActiveMembership();
  if (!membership) {
    return (
      <CandidatesList
        candidates={[]}
        jobs={[]}
        filter={filter}
        query={query}
        seniority={seniority}
        skill={skill}
        completeness={completeness}
        completenessByCandidateId={{}}
        counts={EMPTY_COUNTS}
        duplicateIds={[]}
        page={1}
        totalPages={1}
      />
    );
  }

  const [{ candidates, total }, { counts, duplicateIds }, jobs] =
    await Promise.all([
      listCandidatesPage(membership.organizationId, filter, query, page, {
        seniority,
        skill,
        completeness,
      }),
      getCandidateFilterMeta(membership.organizationId),
      listJobs(
        membership.organizationId,
        isAssignmentScoped(membership.role) ? membership.id : undefined,
      ),
    ]);

  // Completitud de las filas visibles (10 por página): una consulta acotada a esta página,
  // no a todo el pool — barata y siempre corre, a diferencia del filtro que solo activa el
  // camino "hasta 100 + JS" cuando el reclutador lo usa (ver listCandidatesPage).
  const resumeCounts = await getResumeCountsForCandidates(
    candidates.map((c) => ({ id: c.id, profileId: c.profileId })),
  );
  const completenessByCandidateId: Record<string, CandidateCompleteness> = {};
  for (const c of candidates) {
    completenessByCandidateId[c.id] = completenessForCandidate(c, resumeCounts.get(c.id)!);
  }

  return (
    <CandidatesList
      candidates={candidates}
      jobs={jobs.map((j) => ({ id: j.id, title: j.title }))}
      filter={filter}
      query={query}
      seniority={seniority}
      skill={skill}
      completeness={completeness}
      completenessByCandidateId={completenessByCandidateId}
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
