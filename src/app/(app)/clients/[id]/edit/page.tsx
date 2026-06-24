import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { getClientById } from "@/features/recruiter/clients/data/clients.queries";
import { ClientForm } from "@/features/recruiter/clients/ui/ClientForm";
import { editarClienteAction } from "@/features/recruiter/clients/actions";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const client = await getClientById(id, membership.organizationId);
  if (!client) notFound();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <nav aria-label="Migas de pan" className="flex items-center gap-1.5 text-sm text-muted">
        <Link href="/clients" className="hover:text-text">
          Clientes
        </Link>
        <span aria-hidden>/</span>
        <Link href={`/clients/${client.id}`} className="truncate hover:text-text">
          {client.name}
        </Link>
        <span aria-hidden>/</span>
        <span className="text-text">Editar</span>
      </nav>
      <h1 className="font-display text-xl font-bold text-text">Editar cliente</h1>
      <ClientForm
        action={editarClienteAction}
        submitLabel="Guardar cambios"
        clientId={client.id}
        cancelHref={`/clients/${client.id}`}
        defaults={{
          name: client.name,
          contactName: client.contactName,
          contactEmail: client.contactEmail,
          notes: client.notes,
        }}
      />
    </div>
  );
}
