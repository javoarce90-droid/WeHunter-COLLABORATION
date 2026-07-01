import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { getJobById } from "@/features/recruiter/jobs/data/jobs.queries";
import { listApplicationsByJob } from "@/features/recruiter/applications/data/applications.queries";
import { listCandidates } from "@/features/recruiter/candidates/data/candidates.queries";
import { AgregarCandidatos } from "@/features/recruiter/applications/ui/AgregarCandidatos";
import {
  MODALITY_LABELS,
  SENIORITY_LABELS,
  EMPLOYMENT_LABELS,
  AREA_LABELS,
} from "@/features/recruiter/jobs/ui/field-meta";
import { JobMarkdown } from "@/features/recruiter/jobs/ui/markdown";

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

  const [job, applications, candidates] = await Promise.all([
    getJobById(id, membership.organizationId),
    listApplicationsByJob(id, membership.organizationId),
    listCandidates(membership.organizationId),
  ]);
  if (!job) notFound();

  // Para el alta contextual: el pool ofrece solo candidatos que NO están ya en esta búsqueda.
  const postuladosIds = new Set(applications.map((a) => a.candidateId));
  const poolCandidates = candidates
    .filter((c) => !postuladosIds.has(c.id))
    .map((c) => ({ id: c.id, fullName: c.fullName, email: c.email }));

  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const chips = [
    job.jobArea ? AREA_LABELS[job.jobArea] : null,
    job.location,
    job.modality ? MODALITY_LABELS[job.modality] : null,
    job.seniority ? SENIORITY_LABELS[job.seniority] : null,
    job.employmentType ? EMPLOYMENT_LABELS[job.employmentType] : null,
    job.vacancies && job.vacancies > 1 ? `${job.vacancies} vacantes` : null,
    salary,
  ].filter((c): c is string => !!c);

  // El aviso se arma desde los campos estructurados. `posting` es el legacy de respaldo.
  const sections = [
    { title: "Objetivos del puesto", body: job.objectives },
    { title: "Responsabilidades", body: job.responsibilities },
    { title: "Requisitos", body: job.requirements },
  ].filter((s): s is { title: string; body: string } => !!s.body?.trim());
  const hasStructured = sections.length > 0 || (job.benefits?.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-sm text-muted">Vista previa del aviso público</span>
        <div className="flex items-center gap-4">
          <Link
            href={`/jobs/${job.id}/edit`}
            className="text-xs font-semibold text-primary hover:text-primary-hover"
          >
            Editar aviso
          </Link>
          <AgregarCandidatos
            jobId={job.id}
            poolCandidates={poolCandidates}
            redirectAfterAddTo={`/jobs/${job.id}/pipeline`}
          />
        </div>
      </div>

      <article className="rounded-[var(--radius)] border border-border bg-surface p-8 shadow-[var(--shadow)]">
        <header className="mb-6 border-b border-border pb-5">
          <h1 className="font-display text-2xl font-bold text-text">{job.title}</h1>
          {job.position && (
            <p className="mt-1 text-sm font-medium text-muted">{job.position}</p>
          )}
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

        {hasStructured ? (
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
        ) : job.posting ? (
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
