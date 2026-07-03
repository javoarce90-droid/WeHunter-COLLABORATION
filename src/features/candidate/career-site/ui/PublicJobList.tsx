import Link from "next/link";
import {
  MODALITY_LABELS,
  SENIORITY_LABELS,
  EMPLOYMENT_LABELS,
  AREA_LABELS,
} from "@/features/recruiter/jobs/ui/field-meta";
import type { CareerSiteJobSummary } from "../data/career-site.data";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
}

export function PublicJobList({ slug, jobs }: { slug: string; jobs: CareerSiteJobSummary[] }) {
  if (jobs.length === 0) {
    return (
      <p className="text-sm text-muted">
        Esta organización no tiene búsquedas abiertas en este momento.
      </p>
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
