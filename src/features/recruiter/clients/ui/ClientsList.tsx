import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import type { ClientWithStats } from "../data/clients.queries";
import type { ClientsCopy } from "../copy";

export function ClientsList({
  clients,
  copy,
}: {
  clients: ClientWithStats[];
  copy: ClientsCopy;
}) {
  if (clients.length === 0) {
    return (
      <EmptyState
        title={copy.emptyTitle}
        description={copy.emptyDescription}
        action={{ label: copy.addButtonLabel, href: "/clients/new" }}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-label">
              {copy.tableHeader}
            </th>
            <th className="hidden px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-label sm:table-cell">
              Contacto
            </th>
            <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-label">
              Búsquedas
            </th>
            <th className="hidden px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-label md:table-cell">
              Solicitudes
            </th>
            <th className="hidden px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-label lg:table-cell">
              Recruiter asignado
            </th>
            <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-label">
              Link de acceso
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {clients.map((client) => (
            <tr key={client.id} className="transition-colors hover:bg-bg">
              <td className="px-4 py-3">
                <Link
                  href={`/clients/${client.id}`}
                  className="group flex min-w-0 items-center gap-2.5"
                >
                  <Avatar name={client.name} size="sm" />
                  <span className="truncate font-semibold text-text transition-colors group-hover:text-primary">
                    {client.name}
                  </span>
                </Link>
              </td>
              <td className="hidden px-3 py-3 sm:table-cell">
                <p className="truncate text-text">{client.contactName || "—"}</p>
                {client.contactEmail && (
                  <p className="truncate text-xs text-muted">{client.contactEmail}</p>
                )}
              </td>
              <td className="px-3 py-3 tabular-nums text-muted">{client.jobCount || "—"}</td>
              <td className="hidden px-3 py-3 tabular-nums text-muted md:table-cell">
                {client.requisitionCount || "—"}
              </td>
              <td className="hidden px-3 py-3 lg:table-cell">
                {client.assignedRecruiterName ? (
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar name={client.assignedRecruiterName} size="sm" />
                    <span className="truncate text-text">{client.assignedRecruiterName}</span>
                  </span>
                ) : (
                  <span className="text-xs text-muted">Sin asignar</span>
                )}
              </td>
              <td className="px-4 py-3">
                {client.hasActiveShare ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
                    🔗 Compartido
                  </span>
                ) : (
                  <span className="text-xs text-muted">Sin compartir</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
