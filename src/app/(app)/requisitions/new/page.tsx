import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { can, canReviewRequisitions } from "@/lib/auth/roles";
import { listMembers } from "@/features/recruiter/team/data/team.queries";
import { CargarSolicitudForm } from "@/features/recruiter/requisitions/ui/CargarSolicitudForm";

/** Solo el Hiring Manager llega acá — carga su propia solicitud y elige a qué recruiter
 *  se la asigna (ese recruiter es quien la revisa). */
export default async function NewRequisitionPage() {
  const membership = await getActiveMembership();
  if (!membership || !can(membership.role, "requisitions.create")) notFound();

  const members = await listMembers(membership.organizationId);
  const reviewers = members
    .filter((m) => m.status === "active" && canReviewRequisitions(m.role))
    .map((m) => ({ membershipId: m.membershipId, name: m.name ?? m.email }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/requisitions" className="text-xs font-semibold text-muted hover:text-text">
          ← Volver a Solicitudes
        </Link>
        <h1 className="mt-1 font-display text-xl font-bold text-text">Nueva solicitud</h1>
        <p className="mt-0.5 max-w-[70ch] text-sm text-muted">
          Contale al equipo qué perfil necesitás. El recruiter que elijas la revisa y, si la
          aprueba, nace la búsqueda.
        </p>
      </div>

      <CargarSolicitudForm reviewers={reviewers} />
    </div>
  );
}
