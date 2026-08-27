import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getActiveMembership, getCurrentUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import {
  getClientById,
  listJobsByClient,
  listAssignableRecruiters,
} from "@/features/recruiter/clients/data/clients.queries";
import { listSharesByClient } from "@/features/recruiter/clients/data/client-shares.data";
import { listClientEmailsByClient } from "@/features/recruiter/clients/data/client-emails.data";
import { listInsertableLinksForClient } from "@/features/recruiter/clients/data/client-email-links.data";
import { canAssignRecruiter } from "@/features/recruiter/clients/domain/asignar-recruiter-a-cliente";
import { listRequisitionsByClient } from "@/features/recruiter/requisitions/data/requisitions.queries";
import { getConnectionByProfile } from "@/features/recruiter/google-calendar/data/connections.queries";
import { hasGmailSendScope } from "@/features/recruiter/google-calendar/data/oauth-client";
import { ClientDetailContent } from "@/features/recruiter/clients/ui/ClientDetailContent";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();
  // Ver clients/page.tsx: en Enterprise el módulo "Clientes" no existe.
  if (membership.workspaceType === "enterprise") notFound();

  // URL base resuelta en el server (host de la request) y pasada como prop. Así el enlace
  // del portal se renderiza idéntico en server y cliente -> sin mismatch de hidratación.
  const reqHeaders = await headers();
  const host = reqHeaders.get("host") ?? "";
  const proto = reqHeaders.get("x-forwarded-proto") ?? "http";
  const appUrl = host ? `${proto}://${host}` : "";

  const user = await getCurrentUser();

  const [client, jobs, shares, recruiters, requisitions, emails, emailLinks, connection] =
    await Promise.all([
      getClientById(id, membership.organizationId),
      listJobsByClient(id, membership.organizationId),
      listSharesByClient(id, membership.organizationId),
      listAssignableRecruiters(membership.organizationId, id),
      listRequisitionsByClient(id, membership.organizationId),
      listClientEmailsByClient(id, membership.organizationId),
      listInsertableLinksForClient(id, membership.organizationId),
      user
        ? getConnectionByProfile(user.id, membership.organizationId)
        : Promise.resolve(null),
    ]);
  if (!client) notFound();

  const canSendEmail = !!connection && hasGmailSendScope(connection);
  const emailLinksAbsolute = emailLinks.map((l) => ({
    label: l.label,
    url: `${appUrl}${l.path}`,
  }));

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Migas de pan" className="flex items-center gap-1.5 text-sm text-muted">
        <Link href="/clients" className="hover:text-text">
          Clientes
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate text-text">{client.name}</span>
      </nav>

      <ClientDetailContent
        client={client}
        jobs={jobs}
        shares={shares}
        recruiters={recruiters}
        requisitions={requisitions}
        emails={emails}
        emailLinks={emailLinksAbsolute}
        canSendEmail={canSendEmail}
        appUrl={appUrl}
        canManageClients={can(membership.role, "clients.manage")}
        canManageJobs={can(membership.role, "jobs.manage")}
        canAssignRecruiter={canAssignRecruiter(membership.role)}
      />
    </div>
  );
}
