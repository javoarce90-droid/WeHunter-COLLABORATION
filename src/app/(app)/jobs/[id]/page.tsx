import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { getJobById } from "@/features/recruiter/jobs/data/jobs.queries";
import { getJobStageCounts } from "@/features/recruiter/applications/data/applications.queries";
import { KIND_DOT } from "@/features/recruiter/applications/ui/stage-visual";
import { getClientById } from "@/features/recruiter/clients/data/clients.queries";
import {
  MODALITY_LABELS,
  SENIORITY_LABELS,
  EMPLOYMENT_LABELS,
  PRIORITY_LABELS,
  PRIORITY_BADGE,
  AREA_LABELS,
} from "@/features/recruiter/jobs/ui/field-meta";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

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

/** Pestaña Detalle: resumen de la búsqueda + foto del pipeline. El job ya está validado por el layout. */
export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  // getJobById está cacheado: comparte la transacción con la cabecera del layout.
  const [job, counts] = await Promise.all([
    getJobById(id, membership.organizationId),
    getJobStageCounts(id, membership.organizationId),
  ]);
  if (!job) notFound();

  const client = job.clientId
    ? await getClientById(job.clientId, membership.organizationId)
    : null;

  const enPipeline = counts.stages.reduce((sum, s) => sum + s.count, 0);

  const facts: { label: string; value: string }[] = [
    { label: "Postulaciones", value: String(counts.recibidas) },
    { label: "Sin revisar", value: String(counts.pendientes) },
    { label: "En pipeline", value: String(enPipeline) },
    { label: "Creada", value: dateFmt.format(job.createdAt) },
  ];

  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  // Filas de "Detalles" que efectivamente tienen valor (progressive disclosure).
  const detailRows: { label: string; value: string }[] = [
    job.position ? { label: "Puesto", value: job.position } : null,
    job.jobArea ? { label: "Área", value: AREA_LABELS[job.jobArea] } : null,
    job.vacancies ? { label: "Vacantes", value: String(job.vacancies) } : null,
    job.location ? { label: "Ubicación", value: job.location } : null,
    job.modality ? { label: "Modalidad", value: MODALITY_LABELS[job.modality] } : null,
    job.seniority ? { label: "Seniority", value: SENIORITY_LABELS[job.seniority] } : null,
    job.employmentType
      ? { label: "Contratación", value: EMPLOYMENT_LABELS[job.employmentType] }
      : null,
    salary ? { label: "Salario", value: salary } : null,
    job.deadline
      ? { label: "Deadline", value: dateFmt.format(new Date(job.deadline)) }
      : null,
  ].filter((r): r is { label: string; value: string } => r !== null);

  const hasDetails =
    client || detailRows.length > 0 || job.priority || (job.skills?.length ?? 0) > 0;

  // El aviso se arma desde los campos estructurados; `posting` queda como legacy de respaldo.
  const avisoSections = [
    { title: "Objetivos del puesto", body: job.objectives },
    { title: "Responsabilidades", body: job.responsibilities },
    { title: "Requisitos", body: job.requirements },
  ].filter((s): s is { title: string; body: string } => !!s.body?.trim());
  const hasAviso =
    avisoSections.length > 0 || (job.benefits?.length ?? 0) > 0 || !!job.posting;

  return (
    <div className="flex flex-col gap-5">
      {/* Datos clave: tira densa con divisores finos, no tarjetas KPI. */}
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border sm:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="bg-surface px-4 py-3">
            <dt className="text-xs font-medium text-muted">{f.label}</dt>
            <dd className="mt-0.5 font-semibold text-text tabular-nums">
              {f.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* Detalles de la búsqueda (solo lo que tiene valor) */}
      {hasDetails && (
        <SectionCard
          title="Detalles"
          action={
            job.priority ? (
              <Badge variant={PRIORITY_BADGE[job.priority]}>
                Prioridad {PRIORITY_LABELS[job.priority].toLowerCase()}
              </Badge>
            ) : undefined
          }
          bodyClassName="flex flex-col gap-4"
        >
          {client && (
              <div>
                <p className="text-xs font-medium text-muted">Cliente</p>
                <Link
                  href={`/clients/${client.id}`}
                  className="mt-0.5 inline-block font-semibold text-text hover:text-primary"
                >
                  {client.name}
                </Link>
              </div>
            )}
            {detailRows.length > 0 && (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                {detailRows.map((r) => (
                  <div key={r.label}>
                    <dt className="text-xs font-medium text-muted">{r.label}</dt>
                    <dd className="mt-0.5 font-semibold text-text">{r.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {(job.skills?.length ?? 0) > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {job.skills!.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-semibold text-primary-hover"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
        </SectionCard>
      )}

      {/* Aviso público (armado desde los campos estructurados) */}
      {hasAviso && (
        <SectionCard
          title="Aviso público"
          action={
            <Link
              href={`/jobs/${job.id}/aviso`}
              className="text-xs font-semibold text-primary hover:text-primary-hover"
            >
              Ver aviso →
            </Link>
          }
          bodyClassName="flex flex-col gap-5"
        >
          <>
            {avisoSections.length > 0
              ? avisoSections.map((s) => (
                  <div key={s.title}>
                    <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-label">
                      {s.title}
                    </h3>
                    <p className="max-w-[70ch] whitespace-pre-wrap text-sm leading-relaxed text-text/80">
                      {s.body}
                    </p>
                  </div>
                ))
              : job.posting && (
                  <p className="max-w-[70ch] whitespace-pre-wrap text-sm leading-relaxed text-text/80">
                    {job.posting}
                  </p>
                )}
            {(job.benefits?.length ?? 0) > 0 && (
              <div>
                <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-label">
                  Beneficios
                </h3>
                <ul className="flex flex-col gap-1">
                  {job.benefits!.map((b, i) => (
                    <li key={i} className="text-sm text-text/80">
                      <span className="font-semibold text-text">{b.name}</span>
                      {b.description ? ` — ${b.description}` : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        </SectionCard>
      )}

      {/* Brief interno */}
      <SectionCard
        title="Brief interno"
        action={
          <Link
            href={`/jobs/${job.id}/edit`}
            className="text-xs font-semibold text-primary hover:text-primary-hover"
          >
            Editar
          </Link>
        }
      >
          {job.description ? (
            <p className="max-w-[70ch] whitespace-pre-wrap text-sm leading-relaxed text-text/80">
              {job.description}
            </p>
          ) : (
            <p className="text-sm text-muted">
              Esta búsqueda todavía no tiene descripción.{" "}
              <Link
                href={`/jobs/${job.id}/edit`}
                className="font-semibold text-primary hover:text-primary-hover"
              >
                Agregá una
              </Link>{" "}
              para dar contexto al equipo.
            </p>
          )}
        </SectionCard>

      {/* Foto del pipeline */}
      <SectionCard
        title="Pipeline"
        action={
          <Link
            href={`/jobs/${job.id}/pipeline`}
            className="text-xs font-semibold text-primary hover:text-primary-hover"
          >
            Ver pipeline →
          </Link>
        }
      >
          {enPipeline === 0 ? (
            <p className="text-sm text-muted">
              Todavía no hay candidatos en el pipeline.{" "}
              <Link
                href={`/jobs/${job.id}/postulados`}
                className="font-semibold text-primary hover:text-primary-hover"
              >
                {counts.pendientes > 0
                  ? `Revisá las ${counts.pendientes} postulaciones que esperan`
                  : "Revisá las postulaciones"}
              </Link>
              .
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {counts.stages.map((stage) => (
                <span
                  key={stage.stageId}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-text",
                    stage.count === 0 ? "opacity-45" : undefined,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: KIND_DOT[stage.kind] }}
                    aria-hidden
                  />
                  {stage.name}
                  <span className="tabular-nums">{stage.count}</span>
                </span>
              ))}
            </div>
          )}
        </SectionCard>
    </div>
  );
}
