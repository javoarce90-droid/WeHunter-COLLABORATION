import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { listRequisitions } from "@/features/recruiter/requisitions/data/requisitions.queries";
import { RequisitionsList } from "@/features/recruiter/requisitions/ui/RequisitionsList";

/** Bandeja de solicitudes de búsqueda que mandaron los clientes (§17). */
export default async function RequisitionsPage() {
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const requisitions = await listRequisitions(membership.organizationId);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Solicitudes</h1>
        <p className="mt-0.5 max-w-[70ch] text-sm text-muted">
          Búsquedas que pidieron tus clientes. Al aprobar una, se crea la búsqueda en
          borrador con los datos que cargaron.
        </p>
      </div>

      <RequisitionsList requisitions={requisitions} />
    </div>
  );
}
