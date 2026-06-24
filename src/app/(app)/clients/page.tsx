import { Suspense } from "react";
import Link from "next/link";
import { getActiveMembership } from "@/lib/auth/session";
import { listClientsWithStats } from "@/features/recruiter/clients/data/clients.queries";
import { ClientsList } from "@/features/recruiter/clients/ui/ClientsList";
import { ListSkeleton } from "@/components/ui/list-skeleton";

/** El shell (título + acción) pinta al instante; el listado se streamea. */
export default function ClientsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-text">Clientes</h1>
          <p className="text-sm text-muted">Las empresas para las que reclutás.</p>
        </div>
        <Link
          href="/clients/new"
          className="inline-flex items-center justify-center rounded-[var(--radius)] bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Agregar cliente
        </Link>
      </div>

      <Suspense fallback={<ListSkeleton />}>
        <ClientsSection />
      </Suspense>
    </div>
  );
}

async function ClientsSection() {
  const membership = await getActiveMembership();
  const clients = membership
    ? await listClientsWithStats(membership.organizationId)
    : [];
  return <ClientsList clients={clients} />;
}
