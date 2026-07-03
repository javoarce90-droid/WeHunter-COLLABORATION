import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import {
  getClientById,
  listJobsByClient,
} from "@/features/recruiter/clients/data/clients.queries";
import { JOB_STATUS_META } from "@/features/recruiter/jobs/ui/status-meta";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Job } from "@/db/schema";

/** Ficha del cliente: datos de contacto + búsquedas vinculadas. */
export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const [client, jobs] = await Promise.all([
    getClientById(id, membership.organizationId),
    listJobsByClient(id, membership.organizationId),
  ]);
  if (!client) notFound();

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="Migas de pan" className="flex items-center gap-1.5 text-sm text-muted">
        <Link href="/clients" className="hover:text-text">
          Clientes
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate text-text">{client.name}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={client.name} size="lg" />
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold text-text">{client.name}</h1>
            {(client.contactName || client.contactEmail) && (
              <p className="mt-0.5 truncate text-sm text-muted">
                {client.contactName}
                {client.contactName && client.contactEmail ? " · " : ""}
                {client.contactEmail}
              </p>
            )}
          </div>
        </div>
        <Link
          href={`/clients/${client.id}/edit`}
          className="inline-flex items-center justify-center rounded-[var(--radius)] border border-border px-3 py-2 text-sm font-semibold text-muted transition-colors hover:border-primary hover:text-primary"
        >
          Editar
        </Link>
      </div>

      {client.notes && (
        <section className="rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow)]">
          <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-label">
            Notas
          </h2>
          <p className="whitespace-pre-wrap text-sm text-text">{client.notes}</p>
        </section>
      )}

      <section className="rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]">
        <div className="border-b border-border px-5 py-3.5">
          <h2 className="text-sm font-bold text-text">Búsquedas del cliente</h2>
        </div>
        {jobs.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted">
            Este cliente no tiene búsquedas vinculadas. Vinculá una desde el formulario de
            la búsqueda.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {jobs.map((job) => {
              const meta = JOB_STATUS_META[job.status as Job["status"]];
              return (
                <li key={job.id}>
                  <Link
                    href={`/jobs/${job.id}/pipeline`}
                    className="group flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-bg"
                  >
                    <span className="truncate font-semibold text-text transition-colors group-hover:text-primary">
                      {job.title}
                    </span>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
