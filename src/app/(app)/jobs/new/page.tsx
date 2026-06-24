import { getActiveMembership } from "@/lib/auth/session";
import { listClientsForSelect } from "@/features/recruiter/clients/data/clients.queries";
import { JobForm } from "@/features/recruiter/jobs/ui/JobForm";
import { crearBusquedaAction } from "@/features/recruiter/jobs/actions";

export default async function NewJobPage() {
  const membership = await getActiveMembership();
  const clients = membership
    ? await listClientsForSelect(membership.organizationId)
    : [];

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Nueva búsqueda</h1>
        <p className="text-sm text-muted">
          Se crea como borrador. La publicás cuando esté lista.
        </p>
      </div>
      <JobForm action={crearBusquedaAction} submitLabel="Crear búsqueda" clients={clients} />
    </div>
  );
}
