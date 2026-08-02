import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import { listRequisitions } from "@/features/recruiter/requisitions/data/requisitions.queries";
import { RequisitionsList } from "@/features/recruiter/requisitions/ui/RequisitionsList";

/** Bandeja de solicitudes de búsqueda que mandaron los clientes (§17). */
export default async function RequisitionsPage() {
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const requisitions = await listRequisitions(membership.organizationId);
  const pending = requisitions.filter((r) => r.status === "pending").length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="flex items-center gap-2.5 font-display text-xl font-bold text-text">
          Solicitudes
          {pending > 0 && (
            <span className="rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-xs font-semibold text-[#92400E]">
              {pending} pendiente{pending !== 1 ? "s" : ""}
            </span>
          )}
        </h1>
        <p className="mt-0.5 max-w-[70ch] text-sm text-muted">
          Pedidos de búsqueda de tus clientes. Al aprobar una, se crea la búsqueda en
          borrador con los datos que cargaron.
        </p>
      </div>

      <RequisitionsList requisitions={requisitions} canReview={can(membership.role, "requisitions.review")} />

      <p className="max-w-[80ch] text-xs text-muted">
        Una solicitud siempre nace de un cliente: no hay solicitudes &quot;sueltas&quot;. El
        cliente la carga desde su link, sin cuenta. Aprobarla la convierte en una búsqueda
        del ATS, ya vinculada a ese cliente.
      </p>
    </div>
  );
}
