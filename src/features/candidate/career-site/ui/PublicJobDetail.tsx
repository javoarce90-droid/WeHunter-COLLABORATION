import Link from "next/link";
import {
  MODALITY_LABELS,
  SENIORITY_LABELS,
  EMPLOYMENT_LABELS,
  AREA_LABELS,
} from "@/features/recruiter/jobs/ui/field-meta";
import { JobPostingContent } from "@/features/recruiter/jobs/ui/JobPostingContent";
import { ShareButtons } from "./ShareButtons";
import { accentStyle } from "./brand";
import type { CareerSiteJobDetail } from "../data/career-site.data";

function formatSalary(min: number | null, max: number | null, currency: string | null): string | null {
  if (min == null && max == null) return null;
  const cur = currency ? `${currency} ` : "";
  const fmt = (n: number) => n.toLocaleString("es-AR");
  if (min != null && max != null) return `${cur}${fmt(min)} – ${fmt(max)}`;
  return `${cur}${fmt((min ?? max) as number)}`;
}

export function PublicJobDetail({
  slug,
  job,
  shareUrl,
  accentColor,
}: {
  slug: string;
  job: CareerSiteJobDetail;
  shareUrl: string;
  accentColor?: string;
}) {
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const chips = [
    job.jobArea ? AREA_LABELS[job.jobArea] : null,
    job.location,
    job.modality ? MODALITY_LABELS[job.modality] : null,
    job.seniority ? SENIORITY_LABELS[job.seniority] : null,
    job.employmentType ? EMPLOYMENT_LABELS[job.employmentType] : null,
    salary,
  ].filter((c): c is string => !!c);

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/careers/${slug}`} className="text-xs font-semibold text-primary hover:underline">
        ← Ver todas las búsquedas
      </Link>

      <article className="rounded-[var(--radius)] border border-border bg-surface p-8 shadow-[var(--shadow)]">
        <JobPostingContent
          title={job.title}
          position={job.position}
          chips={chips}
          objectives={job.objectives}
          responsibilities={job.responsibilities}
          requirements={job.requirements}
          benefits={job.benefits}
        />

        {(job.skills?.length ?? 0) > 0 && (
          <div className="mt-6 border-t border-border pt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-label">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {job.skills!.map((s) => (
                <span key={s} className="rounded-full bg-bg px-2.5 py-0.5 text-xs font-medium text-text">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ShareButtons url={shareUrl} title={job.title} />
        <Link
          href={`/careers/${slug}/${job.id}/postular`}
          style={accentStyle(accentColor)}
          className="inline-flex items-center justify-center rounded-[var(--radius)] bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-[filter] hover:brightness-90"
        >
          Postular
        </Link>
      </div>
    </div>
  );
}
