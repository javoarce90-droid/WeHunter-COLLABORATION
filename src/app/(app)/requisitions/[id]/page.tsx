import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { getRequisitionById } from "@/features/recruiter/requisitions/data/requisitions.queries";
import { RequisitionReviewForm } from "@/features/recruiter/requisitions/ui/RequisitionReviewForm";
import {
  REQUISITION_REASON_LABELS,
  REQUISITION_STATUS_META,
} from "@/features/recruiter/requisitions/ui/requisition-meta";
import {
  AREA_LABELS,
  EMPLOYMENT_LABELS,
  MODALITY_LABELS,
  SENIORITY_LABELS,
} from "@/features/recruiter/jobs/ui/field-meta";
import { JobMarkdown } from "@/features/recruiter/jobs/ui/markdown";
import { Badge } from "@/components/ui/badge";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function DataRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-label">{label}</span>
      <span className="text-sm text-text">{value}</span>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string | null }) {
  if (!body) return null;
  return (
    <section className="rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow)]">
      <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-label">
        {title}
      </h2>
      <JobMarkdown text={body} />
    </section>
  );
}

/** Detalle de una solicitud del cliente, con la revisión del recruiter (§17). */
export default async function RequisitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const requisition = await getRequisitionById(id, membership.organizationId);
  if (!requisition) notFound();

  const status = REQUISITION_STATUS_META[requisition.status];

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Migas de pan" className="flex items-center gap-1.5 text-sm text-muted">
        <Link href="/requisitions" className="hover:text-text">
          Solicitudes
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate text-text">{requisition.title}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold text-text">{requisition.title}</h1>
          <p className="mt-0.5 text-sm text-muted">
            {requisition.clientName ? `${requisition.clientName} · ` : ""}
            Enviada el {dateFormatter.format(requisition.createdAt)}
          </p>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      <section className="grid gap-4 rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow)] sm:grid-cols-3">
        <DataRow label="Puesto" value={requisition.position} />
        <DataRow label="Motivo" value={REQUISITION_REASON_LABELS[requisition.reason]} />
        <DataRow
          label="Área"
          value={requisition.jobArea ? AREA_LABELS[requisition.jobArea] : null}
        />
        <DataRow label="Ubicación" value={requisition.location} />
        <DataRow
          label="Modalidad"
          value={requisition.modality ? MODALITY_LABELS[requisition.modality] : null}
        />
        <DataRow
          label="Seniority"
          value={requisition.seniority ? SENIORITY_LABELS[requisition.seniority] : null}
        />
        <DataRow
          label="Contratación"
          value={
            requisition.employmentType ? EMPLOYMENT_LABELS[requisition.employmentType] : null
          }
        />
        <DataRow label="Presupuesto" value={requisition.budget} />
        <DataRow label="Ingreso estimado" value={requisition.estimatedStartDate} />
        <DataRow label="Skills" value={requisition.skills?.join(", ") ?? null} />
      </section>

      <Section title="Objetivos del puesto" body={requisition.objectives} />
      <Section title="Requisitos" body={requisition.requirements} />
      <Section title="Responsabilidades" body={requisition.responsibilities} />

      <section className="rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow)]">
        <h2 className="mb-3 text-sm font-bold text-text">Revisión</h2>
        {requisition.status === "pending" ? (
          <RequisitionReviewForm requisitionId={requisition.id} />
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">
              {status.label}
              {requisition.reviewedAt
                ? ` el ${dateFormatter.format(requisition.reviewedAt)}`
                : ""}
              .
            </p>
            {requisition.reviewNote && (
              <div className="rounded-[var(--radius)] border border-border bg-bg p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-label">
                  Respuesta enviada al cliente
                </p>
                <p className="whitespace-pre-wrap text-sm text-text">{requisition.reviewNote}</p>
              </div>
            )}
            {requisition.jobId && (
              <Link
                href={`/jobs/${requisition.jobId}/pipeline`}
                className="inline-flex w-fit items-center justify-center rounded-[var(--radius)] border border-border px-3 py-2 text-sm font-semibold text-muted transition-colors hover:border-primary hover:text-primary"
              >
                Ver la búsqueda creada
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
