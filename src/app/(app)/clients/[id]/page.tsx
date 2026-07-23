import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import {
  getClientById,
  listJobsByClient,
} from "@/features/recruiter/clients/data/clients.queries";
import { listSharesByClient } from "@/features/recruiter/clients/data/client-shares.data";
import { ClientShareControls } from "@/features/recruiter/clients/ui/ClientShareControls";
import { JOB_STATUS_META } from "@/features/recruiter/jobs/ui/status-meta";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/section-card";
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

  // URL base resuelta en el server (host de la request) y pasada como prop. Así el enlace
  // del portal se renderiza idéntico en server y cliente -> sin mismatch de hidratación.
  const reqHeaders = await headers();
  const host = reqHeaders.get("host") ?? "";
  const proto = reqHeaders.get("x-forwarded-proto") ?? "http";
  const appUrl = host ? `${proto}://${host}` : "";

  const [client, jobs, shares] = await Promise.all([
    getClientById(id, membership.organizationId),
    listJobsByClient(id, membership.organizationId),
    listSharesByClient(id, membership.organizationId),
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
        <SectionCard title="Notas">
          <p className="whitespace-pre-wrap text-sm text-text">{client.notes}</p>
        </SectionCard>
      )}

      <ClientShareControls clientId={client.id} shares={shares} appUrl={appUrl} />

      <SectionCard title="Búsquedas del cliente" flush>
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
      </SectionCard>
    </div>
  );
}
