import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import {
  can,
  canReviewRequisitions,
  isClientScoped,
  isEnterpriseAssignedScoped,
  isRequesterScoped,
} from "@/lib/auth/roles";
import { listRequisitions, type RequisitionsScope } from "@/features/recruiter/requisitions/data/requisitions.queries";
import { RequisitionsList } from "@/features/recruiter/requisitions/ui/RequisitionsList";
import { parsePage, totalPages as calcTotalPages } from "@/lib/pagination";

function scopeFor(
  membership: NonNullable<Awaited<ReturnType<typeof getActiveMembership>>>,
  profileId: string,
): RequisitionsScope {
  if (isClientScoped(membership.role, membership.workspaceType)) {
    return { clientId: membership.assignedClientId };
  }
  if (isEnterpriseAssignedScoped(membership.role, membership.workspaceType)) {
    return { assignedToMembershipId: membership.id };
  }
  if (isRequesterScoped(membership.role)) {
    return { createdByProfileId: profileId };
  }
  return {};
}

/** Bandeja de solicitudes de búsqueda (§17) — camino Cliente (portal externo) y camino HM
 *  (Hiring Manager interno, Enterprise). El HM la ve acotada a las suyas ("carga, no
 *  revisa"); quien la revisa es el recruiter que el HM eligió al cargarla. */
export default async function RequisitionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const [membership, user, { page: rawPage }] = await Promise.all([
    getActiveMembership(),
    getCurrentUser(),
    searchParams,
  ]);
  if (!membership || !user) notFound();

  const page = parsePage(rawPage);
  const { requisitions, total, pendingCount } = await listRequisitions(
    membership.organizationId,
    scopeFor(membership, user.id),
    page,
  );
  const canCreate = can(membership.role, "requisitions.create");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 font-display text-xl font-bold text-text">
            Solicitudes
            {pendingCount > 0 && (
              <span className="rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-xs font-semibold text-[#92400E]">
                {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
              </span>
            )}
          </h1>
          <p className="mt-0.5 max-w-[70ch] text-sm text-muted">
            {canCreate
              ? "Tus pedidos de búsqueda. El recruiter que elegiste al cargarla la revisa y, si la aprueba, nace la búsqueda."
              : "Pedidos de búsqueda de tus clientes y Hiring Managers. Al aprobar una, se crea la búsqueda en borrador con los datos que cargaron."}
          </p>
        </div>
        {canCreate && (
          <Link href="/requisitions/new" className={buttonVariants()}>
            Nueva solicitud
          </Link>
        )}
      </div>

      <RequisitionsList
        requisitions={requisitions}
        canReview={canReviewRequisitions(membership.role)}
        canCreate={canCreate}
      />
      <Pagination
        page={page}
        totalPages={calcTotalPages(total)}
        buildHref={(p) => `/requisitions?page=${p}`}
      />
    </div>
  );
}
