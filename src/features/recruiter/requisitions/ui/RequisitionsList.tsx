import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SENIORITY_LABELS } from "@/features/recruiter/jobs/ui/field-meta";
import type { JobSeniority } from "@/features/recruiter/jobs/domain/job-details";
import type { RequisitionListRow } from "../data/requisitions.queries";
import { REQUISITION_REASON_LABELS, REQUISITION_STATUS_META } from "./requisition-meta";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function RequisitionsList({
  requisitions,
  canReview,
  canCreate,
}: {
  requisitions: RequisitionListRow[];
  canReview: boolean;
  /** Hiring Manager: puede cargar solicitudes propias — cambia el empty state para
   *  ofrecerle crear la primera en vez de mandarlo a Clientes (no lo ve). */
  canCreate: boolean;
}) {
  if (requisitions.length === 0) {
    return canCreate ? (
      <EmptyState
        title="Todavía no cargaste ninguna solicitud"
        description="Contale al equipo de reclutamiento qué perfil necesitás. Elegís quién la revisa y seguís el estado acá mismo."
        action={{ label: "Nueva solicitud", href: "/requisitions/new" }}
      />
    ) : (
      <EmptyState
        title="Todavía no hay solicitudes"
        description="Cuando un cliente o un Hiring Manager pida una búsqueda, la vas a ver acá para revisarla. Generá el enlace del portal desde la ficha del cliente."
        action={{ label: "Ir a Clientes", href: "/clients" }}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-label">
              Solicitud
            </th>
            <th className="hidden px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-label sm:table-cell">
              Solicitante
            </th>
            <th className="hidden px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-label md:table-cell">
              Motivo
            </th>
            <th className="hidden px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-label lg:table-cell">
              Presupuesto
            </th>
            <th className="hidden px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-label lg:table-cell">
              Inicio
            </th>
            <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-label">
              Estado
            </th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {requisitions.map((r) => {
            const status = REQUISITION_STATUS_META[r.status];
            const subtitle = [
              r.seniority ? SENIORITY_LABELS[r.seniority as JobSeniority] : null,
              r.location,
            ]
              .filter(Boolean)
              .join(" · ");
            const canReviewThis = canReview && r.status === "pending";

            return (
              <tr key={r.id} className="transition-colors hover:bg-bg">
                <td className="px-4 py-3">
                  <Link href={`/requisitions/${r.id}`} className="group block min-w-0">
                    <p className="truncate font-semibold text-text transition-colors group-hover:text-primary">
                      {r.title}
                    </p>
                    {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
                  </Link>
                </td>
                <td className="hidden px-3 py-3 sm:table-cell">
                  {r.clientName || r.requestedByName ? (
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar name={(r.clientName || r.requestedByName)!} size="sm" />
                      <span className="truncate text-text">{r.clientName ?? r.requestedByName}</span>
                    </div>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="hidden px-3 py-3 text-muted md:table-cell">
                  {REQUISITION_REASON_LABELS[r.reason]}
                </td>
                <td className="hidden px-3 py-3 tabular-nums text-muted lg:table-cell">
                  {r.budget || "—"}
                </td>
                <td className="hidden px-3 py-3 text-muted lg:table-cell">
                  {r.estimatedStartDate ? dateFormatter.format(new Date(r.estimatedStartDate)) : "—"}
                </td>
                <td className="px-3 py-3">
                  <Badge variant={status.variant}>{status.label}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/requisitions/${r.id}`}
                    className={[
                      "text-xs font-semibold",
                      canReviewThis ? "text-primary hover:text-primary-hover" : "text-muted",
                    ].join(" ")}
                  >
                    {canReviewThis ? "Revisar →" : "›"}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
