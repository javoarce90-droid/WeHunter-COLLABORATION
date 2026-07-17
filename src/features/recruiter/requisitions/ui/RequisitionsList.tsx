import Link from "next/link";
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

export function RequisitionsList({ requisitions }: { requisitions: RequisitionListRow[] }) {
  if (requisitions.length === 0) {
    return (
      <EmptyState
        title="Todavía no hay solicitudes"
        description="Cuando un cliente pida una búsqueda desde su portal, la vas a ver acá para revisarla. Generá el enlace del portal desde la ficha del cliente."
        action={{ label: "Ir a Clientes", href: "/clients" }}
      />
    );
  }

  return (
    <ul className="divide-y divide-border rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
      {requisitions.map((r) => {
        const status = REQUISITION_STATUS_META[r.status];
        const subtitle = [
          r.clientName,
          r.position,
          r.seniority ? SENIORITY_LABELS[r.seniority as JobSeniority] : null,
          r.location,
          REQUISITION_REASON_LABELS[r.reason],
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <li key={r.id}>
            <Link
              href={`/requisitions/${r.id}`}
              className="group flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-bg"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-text transition-colors group-hover:text-primary">
                  {r.title}
                </p>
                <p className="truncate text-sm text-muted">{subtitle}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="hidden text-xs text-muted sm:inline">
                  {dateFormatter.format(r.createdAt)}
                </span>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
