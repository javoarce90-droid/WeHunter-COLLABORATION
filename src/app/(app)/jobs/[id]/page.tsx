import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { getJobById } from "@/features/recruiter/jobs/data/jobs.queries";
import { getJobStageCounts } from "@/features/recruiter/applications/data/applications.queries";
import {
  APPLICATION_STAGES,
  STAGE_LABELS,
} from "@/features/recruiter/applications/schema";
import { relativeTime } from "@/features/recruiter/jobs/ui/status-meta";
import { Badge } from "@/components/ui/badge";

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

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

  const total = APPLICATION_STAGES.reduce((sum, s) => sum + counts[s], 0);

  const facts: { label: string; value: string }[] = [
    { label: "Candidatos", value: String(total) },
    { label: "Creada", value: dateFmt.format(job.createdAt) },
    { label: "Última actividad", value: relativeTime(job.updatedAt) },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Datos clave: tira densa con divisores finos, no tarjetas KPI. */}
      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-[var(--radius)] border border-border bg-border">
        {facts.map((f) => (
          <div key={f.label} className="bg-surface px-4 py-3">
            <dt className="text-xs font-medium text-muted">{f.label}</dt>
            <dd className="mt-0.5 font-semibold text-text tabular-nums">
              {f.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* Descripción */}
      <section className="rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-bold text-text">Descripción</h2>
          <Link
            href={`/jobs/${job.id}/edit`}
            className="text-xs font-semibold text-primary hover:text-primary-hover"
          >
            Editar
          </Link>
        </div>
        <div className="px-5 py-4">
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
        </div>
      </section>

      {/* Foto del pipeline */}
      <section className="rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-bold text-text">Pipeline</h2>
          <Link
            href={`/jobs/${job.id}/pipeline`}
            className="text-xs font-semibold text-primary hover:text-primary-hover"
          >
            Ver pipeline →
          </Link>
        </div>
        <div className="px-5 py-4">
          {total === 0 ? (
            <p className="text-sm text-muted">
              Todavía no hay candidatos en el pipeline.{" "}
              <Link
                href={`/jobs/${job.id}/pipeline`}
                className="font-semibold text-primary hover:text-primary-hover"
              >
                Postulá al primero
              </Link>
              .
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {APPLICATION_STAGES.map((stage) => (
                <Badge
                  key={stage}
                  variant={stage}
                  className={counts[stage] === 0 ? "opacity-45" : undefined}
                >
                  {STAGE_LABELS[stage]}
                  <span className="ml-1.5 tabular-nums">{counts[stage]}</span>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
