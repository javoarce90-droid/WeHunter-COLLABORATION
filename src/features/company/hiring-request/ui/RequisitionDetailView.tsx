import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  AREA_LABELS,
  MODALITY_LABELS,
  SENIORITY_LABELS,
  EMPLOYMENT_LABELS,
} from "@/features/recruiter/jobs/ui/field-meta";
import type { JobArea, JobModality, JobSeniority, EmploymentType } from "@/features/recruiter/jobs/domain/job-details";
import type { ClientRequisitionDetail } from "../data/hiring-request.data";
import { RequisitionForm } from "./RequisitionForm";
import { STATUS_META, REASON_LABELS } from "./status-meta";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function DetailField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap text-sm text-text">{value}</dd>
    </div>
  );
}

/**
 * Detalle de una solicitud del lado del Cliente. `pending` → formulario editable
 * (`RequisitionForm` en modo `edit`); ya revisada → solo lectura, con la respuesta del equipo.
 */
export function RequisitionDetailView({
  token,
  detail,
}: {
  token: string;
  detail: ClientRequisitionDetail;
}) {
  const status = STATUS_META[detail.status];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <Link
        href={`/client/${token}`}
        className="text-xs font-semibold text-muted hover:text-text"
      >
        ← Volver a mis solicitudes
      </Link>

      {detail.status === "pending" ? (
        <RequisitionForm
          token={token}
          mode="edit"
          requisitionId={detail.id}
          initialValues={detail}
        />
      ) : (
        <Card>
          <div className="flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h1 className="font-display text-lg font-bold text-text">{detail.title}</h1>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>

            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField label="Puesto a cubrir" value={detail.position} />
              <DetailField label="Motivo" value={REASON_LABELS[detail.reason]} />
              <DetailField label="Área" value={detail.jobArea ? AREA_LABELS[detail.jobArea as JobArea] : null} />
              <DetailField label="Ubicación" value={detail.location} />
              <DetailField label="Modalidad" value={detail.modality ? MODALITY_LABELS[detail.modality as JobModality] : null} />
              <DetailField label="Seniority" value={detail.seniority ? SENIORITY_LABELS[detail.seniority as JobSeniority] : null} />
              <DetailField label="Tipo de contratación" value={detail.employmentType ? EMPLOYMENT_LABELS[detail.employmentType as EmploymentType] : null} />
              <DetailField label="Presupuesto" value={detail.budget} />
              <DetailField
                label="Fecha estimada de ingreso"
                value={detail.estimatedStartDate ? dateFormatter.format(new Date(detail.estimatedStartDate)) : null}
              />
              <DetailField label="Skills" value={detail.skills?.join(", ") ?? null} />
            </dl>

            <DetailField label="Objetivos del puesto" value={detail.objectives} />
            <DetailField label="Requisitos" value={detail.requirements} />
            <DetailField label="Responsabilidades" value={detail.responsibilities} />

            <p className="text-xs text-muted">
              Enviada el {dateFormatter.format(new Date(detail.createdAt))}
              {detail.reviewedAt
                ? ` · Revisada el ${dateFormatter.format(new Date(detail.reviewedAt))}`
                : ""}
            </p>

            {detail.reviewNote && (
              <div className="rounded-[var(--radius)] border border-border bg-bg p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-label">
                  Respuesta del equipo
                </p>
                <p className="whitespace-pre-wrap text-sm text-text">{detail.reviewNote}</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
