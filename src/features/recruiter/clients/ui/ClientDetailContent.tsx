import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { AssignedRecruiterControl } from "./AssignedRecruiterControl";
import { ClientShareControls } from "./ClientShareControls";
import { SendClientEmailDialog, type EmailLink } from "./SendClientEmailDialog";
import type { AssignableRecruiter } from "../data/clients.queries";
import type { ClientShareRow } from "../data/client-shares.data";
import type { ClientEmailRow } from "../data/client-emails.data";
import type { RequisitionByClientRow } from "@/features/recruiter/requisitions/data/requisitions.queries";
import {
  REQUISITION_STATUS_META,
  REQUISITION_REASON_LABELS,
} from "@/features/recruiter/requisitions/ui/requisition-meta";
import { JOB_STATUS_META, relativeTime } from "@/features/recruiter/jobs/ui/status-meta";
import type { Client, Job } from "@/db/schema";

const emailDateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

type ClientJob = { id: string; title: string; status: string; updatedAt: Date };

export function ClientDetailContent({
  client,
  jobs,
  shares,
  recruiters,
  requisitions,
  emails,
  emailLinks,
  canSendEmail,
  appUrl,
  canManageClients,
  canManageJobs,
  canAssignRecruiter,
}: {
  client: Client;
  jobs: ClientJob[];
  shares: ClientShareRow[];
  recruiters: AssignableRecruiter[];
  requisitions: RequisitionByClientRow[];
  emails: ClientEmailRow[];
  emailLinks: EmailLink[];
  canSendEmail: boolean;
  appUrl: string;
  canManageClients: boolean;
  canManageJobs: boolean;
  canAssignRecruiter: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
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
        <div className="flex shrink-0 items-center gap-2">
          {canManageClients && (
            <SendClientEmailDialog
              clientId={client.id}
              clientName={client.name}
              contactName={client.contactName}
              contactEmail={client.contactEmail}
              canSendEmail={canSendEmail}
              insertableLinks={emailLinks}
            />
          )}
          {canManageClients && (
            <Link
              href={`/clients/${client.id}/edit`}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              Editar
            </Link>
          )}
          {canManageJobs && (
            <Link
              href={`/jobs/new?clientId=${client.id}`}
              className={buttonVariants({ variant: "primary", size: "sm" })}
            >
              Nueva búsqueda
            </Link>
          )}
        </div>
      </div>

      <AssignedRecruiterControl clientId={client.id} recruiters={recruiters} canEdit={canAssignRecruiter} />

      {client.notes && (
        <SectionCard title="Notas">
          <p className="whitespace-pre-wrap text-sm text-text">{client.notes}</p>
        </SectionCard>
      )}

      <ClientShareControls clientId={client.id} shares={shares} appUrl={appUrl} />

      <SectionCard title="Emails enviados" flush>
        {emails.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">
            Todavía no le enviaste ningún email.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {emails.map((email) => (
              <li key={email.id}>
                <details className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-text">{email.subject}</p>
                      <p className="mt-1 text-xs text-muted">
                        {emailDateFmt.format(email.createdAt)}
                        {email.senderName ? ` · ${email.senderName}` : ""}
                        {" · "}
                        {email.toEmail}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-primary group-open:hidden">
                      Ver
                    </span>
                    <span className="hidden shrink-0 text-xs font-semibold text-muted group-open:inline">
                      Ocultar
                    </span>
                  </summary>
                  <p className="mt-3 whitespace-pre-wrap border-t border-border pt-3 text-sm text-text">
                    {email.body}
                  </p>
                </details>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title={`Solicitudes (${requisitions.length})`} flush>
        {requisitions.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">Sin solicitudes todavía.</p>
        ) : (
          <ul className="divide-y divide-border">
            {requisitions.map((r) => {
              const meta = REQUISITION_STATUS_META[r.status];
              return (
                <li key={r.id}>
                  <Link
                    href={`/requisitions/${r.id}`}
                    className="group flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-bg"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-text transition-colors group-hover:text-primary">
                        {r.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {REQUISITION_REASON_LABELS[r.reason]} · {relativeTime(r.createdAt)}
                      </p>
                    </div>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Búsquedas del cliente" flush>
        {jobs.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted">
            Este cliente no tiene búsquedas vinculadas. Vinculá una desde el formulario de la
            búsqueda.
          </p>
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
