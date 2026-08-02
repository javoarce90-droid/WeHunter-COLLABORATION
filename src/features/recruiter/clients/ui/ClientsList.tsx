import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import type { ClientWithStats } from "../data/clients.queries";

export function ClientsList({ clients }: { clients: ClientWithStats[] }) {
  if (clients.length === 0) {
    return (
      <EmptyState
        title="Todavía no tenés clientes"
        description="Cargá tus empresas cliente para vincular búsquedas y organizar tu cartera."
        action={{ label: "Agregar cliente", href: "/clients/new" }}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-label">
              Cliente
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
