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
    <div className="divide-y divide-border overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
      {clients.map((client) => (
        <Link
          key={client.id}
          href={`/clients/${client.id}`}
          className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-bg"
        >
          <Avatar name={client.name} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-text transition-colors group-hover:text-primary">
              {client.name}
            </p>
            <p className="truncate text-xs text-muted">
              {client.contactName || client.contactEmail || "Sin contacto"}
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted">
            <span className="font-semibold text-text/70 tabular-nums">
              {client.jobCount}
            </span>{" "}
            {client.jobCount === 1 ? "búsqueda" : "búsquedas"}
          </span>
        </Link>
      ))}
    </div>
  );
}
