import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { getJobById } from "@/features/recruiter/jobs/data/jobs.queries";
import {
  MODALITY_LABELS,
  SENIORITY_LABELS,
  EMPLOYMENT_LABELS,
} from "@/features/recruiter/jobs/ui/field-meta";

function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
): string | null {
  if (min == null && max == null) return null;
  const cur = currency ? `${currency} ` : "";
  const fmt = (n: number) => n.toLocaleString("es-AR");
  if (min != null && max != null) return `${cur}${fmt(min)} – ${fmt(max)}`;
  return `${cur}${fmt((min ?? max) as number)}`;
}

/**
 * Preview del aviso: muestra la búsqueda como la vería un candidato en el portal público,
 * sin el chrome interno del ATS. Sirve para revisar antes de publicar. El job ya está
 * validado por el layout (getJobById está cacheado: comparte transacción RLS).
 */
export default async function JobPostingPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const job = await getJobById(id, membership.organizationId);
  if (!job) notFound();

  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const chips = [
    job.location,
    job.modality ? MODALITY_LABELS[job.modality] : null,
    job.seniority ? SENIORITY_LABELS[job.seniority] : null,
    job.employmentType ? EMPLOYMENT_LABELS[job.employmentType] : null,
    salary,
  ].filter((c): c is string => !!c);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm text-muted">Vista previa del aviso público</span>
        <Link
          href={`/jobs/${job.id}/edit`}
          className="text-xs font-semibold text-primary hover:text-primary-hover"
        >
          Editar aviso
        </Link>
      </div>

      <article className="rounded-[var(--radius)] border border-border bg-surface p-8 shadow-[var(--shadow)]">
        <header className="mb-6 border-b border-border pb-5">
          <h1 className="font-display text-2xl font-bold text-text">{job.title}</h1>
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

        {job.posting ? (
          <div className="max-w-[70ch] whitespace-pre-wrap text-sm leading-relaxed text-text">
            {job.posting}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Esta búsqueda todavía no tiene un aviso redactado.{" "}
            <Link
              href={`/jobs/${job.id}/edit`}
              className="font-semibold text-primary hover:text-primary-hover"
            >
              Redactá el aviso
            </Link>{" "}
            para previsualizarlo acá.
          </p>
        )}

        {(job.skills?.length ?? 0) > 0 && (
          <div className="mt-6 border-t border-border pt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              {job.skills!.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-bg px-2.5 py-0.5 text-xs font-medium text-text"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
