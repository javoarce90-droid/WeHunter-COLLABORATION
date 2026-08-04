import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import {
  MODALITY_LABELS,
  SENIORITY_LABELS,
  EMPLOYMENT_LABELS,
  AREA_LABELS,
} from "@/features/recruiter/jobs/ui/field-meta";
import type { CareerSiteJobSummary, CareerSiteSuggestion } from "../data/career-site.data";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

export function PublicJobList({
  slug,
  jobs,
  otherCareerSites = [],
}: {
  slug: string;
  jobs: CareerSiteJobSummary[];
  otherCareerSites?: CareerSiteSuggestion[];
}) {
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <EmptyState
          variant="subtle"
          title="Esta organización no tiene búsquedas abiertas en este momento."
        />
        {otherCareerSites.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-text">También podés mirar estas búsquedas</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {otherCareerSites.map((org) => (
                <Link
                  key={org.organizationId}
                  href={`/careers/${org.slug}`}
                  className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-surface p-4 shadow-[var(--shadow)] transition-[transform,box-shadow,border-color] duration-[var(--motion-base)] ease-[var(--ease-out-quart)] hover:-translate-y-[3px] hover:border-primary hover:shadow-[var(--shadow-overlay)]"
                >
                  <div className="h-10 w-10 shrink-0">
                    {org.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={org.logoUrl}
                        alt=""
                        className="h-full w-full rounded-[var(--radius)] object-cover"
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center rounded-[var(--radius)] bg-primary-light text-sm font-bold text-primary-hover">
                        {org.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text">{org.name}</p>
                    <p className="text-xs text-muted">
                      {org.openJobsCount} búsqueda{org.openJobsCount !== 1 ? "s" : ""} abierta
                      {org.openJobsCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {jobs.map((job) => {
        const chips = [
          job.jobArea ? AREA_LABELS[job.jobArea] : null,
          job.location,
          job.modality ? MODALITY_LABELS[job.modality] : null,
          job.seniority ? SENIORITY_LABELS[job.seniority] : null,
          job.employmentType ? EMPLOYMENT_LABELS[job.employmentType] : null,
        ].filter((c): c is string => !!c);

        return (
          <li key={job.id}>
            <Link
              href={`/careers/${slug}/${job.id}`}
              className="block rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow)] transition-[transform,box-shadow,border-color] duration-[var(--motion-base)] ease-[var(--ease-out-quart)] hover:-translate-y-[3px] hover:border-primary hover:shadow-[var(--shadow-overlay)]"
            >
              <h2 className="font-display text-base font-bold text-text">{job.title}</h2>
              {job.position && <p className="mt-0.5 text-sm text-muted">{job.position}</p>}
              {chips.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {chips.map((c) => (
                    <span
                      key={c}
                      className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-primary-hover"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-3 text-xs text-muted">Publicado el {formatDate(job.createdAt)}</p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
