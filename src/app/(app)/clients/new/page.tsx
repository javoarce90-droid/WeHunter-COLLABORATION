import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientForm } from "@/features/recruiter/clients/ui/ClientForm";
import { crearClienteAction } from "@/features/recruiter/clients/actions";
import { listAssignableClientOwners } from "@/features/recruiter/clients/data/clients.queries";
import { getActiveMembership } from "@/lib/auth/session";

export default async function NewClientPage() {
  const membership = await getActiveMembership();
  if (!membership) notFound();
  if (membership.workspaceType === "enterprise") notFound();

  const assignableMembers = await listAssignableClientOwners(membership.organizationId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <nav aria-label="Migas de pan" className="flex items-center gap-1.5 text-sm text-muted">
        <Link href="/clients" className="hover:text-text">
          Clientes
        </Link>
        <span aria-hidden>/</span>
        <span className="text-text">Nuevo</span>
      </nav>
      <h1 className="font-display text-xl font-bold text-text">Agregar cliente</h1>
      <ClientForm
        action={crearClienteAction}
        submitLabel="Crear cliente"
        assignableMembers={assignableMembers}
      />
    </div>
  );
}
