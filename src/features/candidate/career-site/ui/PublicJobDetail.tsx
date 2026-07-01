import Link from "next/link";
import {
  MODALITY_LABELS,
  SENIORITY_LABELS,
  EMPLOYMENT_LABELS,
  AREA_LABELS,
} from "@/features/recruiter/jobs/ui/field-meta";
import { JobMarkdown } from "@/features/recruiter/jobs/ui/markdown";
import { ShareButtons } from "./ShareButtons";
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
}: {
  slug: string;
  job: CareerSiteJobDetail;
  shareUrl: string;
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

  const sections = [
    { title: "Objetivos del puesto", body: job.objectives },
    { title: "Responsabilidades", body: job.responsibilities },
    { title: "Requisitos", body: job.requirements },
  ].filter((s): s is { title: string; body: string } => !!s.body?.trim());

  return (
    <div className="flex flex-col gap-4">
      <Link href={`/careers/${slug}`} className="text-xs font-semibold text-primary hover:underline">
        ← Ver todas las búsquedas
      </Link>

      <article className="rounded-[var(--radius)] border border-border bg-surface p-8 shadow-[var(--shadow)]">
        <header className="mb-6 border-b border-border pb-5">
          <h1 className="font-display text-2xl font-bold text-text">{job.title}</h1>
          {job.position && <p className="mt-1 text-sm font-medium text-muted">{job.position}</p>}
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
        </header>

        {sections.length > 0 || (job.benefits?.length ?? 0) > 0 ? (
          <div className="flex flex-col gap-6">
            {sections.map((s) => (
              <section key={s.title}>
                <h2 className="mb-1.5 text-sm font-bold text-text">{s.title}</h2>
                <div className="max-w-[70ch] text-sm leading-relaxed text-text/80">
                  <JobMarkdown text={s.body} />
                </div>
              </section>
            ))}
            {(job.benefits?.length ?? 0) > 0 && (
              <section>
                <h2 className="mb-2 text-sm font-bold text-text">Beneficios</h2>
                <ul className="flex flex-col gap-1.5">
                  {job.benefits!.map((b, i) => (
                    <li key={i} className="text-sm text-text/80">
                      <span className="font-semibold text-text">{b.name}</span>
                      {b.description ? ` — ${b.description}` : null}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">Esta búsqueda todavía no tiene una descripción detallada.</p>
        )}

        {(job.skills?.length ?? 0) > 0 && (
          <div className="mt-6 border-t border-border pt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Skills</p>
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
          className="inline-flex items-center justify-center rounded-[var(--radius)] bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Postular
        </Link>
      </div>
    </div>
  );
}
