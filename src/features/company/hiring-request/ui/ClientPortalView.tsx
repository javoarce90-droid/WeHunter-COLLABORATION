import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SENIORITY_LABELS } from "@/features/recruiter/jobs/ui/field-meta";
import type { JobSeniority } from "@/features/recruiter/jobs/domain/job-details";
import type { ClientPortal, RequisitionStatus } from "../data/hiring-request.data";
import { RequisitionForm } from "./RequisitionForm";

const STATUS_META: Record<
  RequisitionStatus,
  { label: string; variant: "warning" | "success" | "danger" }
> = {
  pending: { label: "Pendiente de revisión", variant: "warning" },
  approved: { label: "Aprobada", variant: "success" },
  rejected: { label: "Rechazada", variant: "danger" },
};

const REASON_LABELS = { new_position: "Puesto nuevo", backfill: "Reemplazo" } as const;

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function ClientPortalView({ token, portal }: { token: string; portal: ClientPortal }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-label">
          {portal.organizationName}
        </span>
        <h1 className="font-display text-2xl font-bold text-text">{portal.clientName}</h1>
        <p className="text-sm text-muted">
          Tus solicitudes de búsqueda y el estado de cada una.
        </p>
      </header>

      <RequisitionForm token={token} />

      {portal.requisitions.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-primary/25 bg-bg p-10 text-center text-sm text-muted">
          Todavía no enviaste solicitudes. Cuando envíes una, vas a poder seguir su estado
          desde acá.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {portal.requisitions.map((r) => {
            const status = STATUS_META[r.status];
            return (
              <Card key={r.id}>
                <div className="flex flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold text-text">{r.title}</h2>
                      <p className="truncate text-sm text-muted">
                        {[
                          r.position,
                          r.seniority
                            ? SENIORITY_LABELS[r.seniority as JobSeniority]
                            : null,
                          r.location,
                          REASON_LABELS[r.reason],
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>

                  <p className="text-xs text-muted">
                    Enviada el {dateFormatter.format(new Date(r.createdAt))}
                    {r.reviewedAt
                      ? ` · Revisada el ${dateFormatter.format(new Date(r.reviewedAt))}`
                      : ""}
                  </p>

                  {r.reviewNote && (
                    <div className="rounded-[var(--radius)] border border-border bg-bg p-3">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-label">
                        Respuesta del equipo
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-text">{r.reviewNote}</p>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <footer className="text-center text-xs text-muted">
        Compartido vía WeHunter. Solo ves las solicitudes hechas desde este enlace.
      </footer>
    </div>
  );
}
