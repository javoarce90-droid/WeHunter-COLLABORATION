import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { listApplicationsByJob } from "@/features/recruiter/applications/data/applications.queries";
import { STAGE_LABELS } from "@/features/recruiter/applications/schema";
import {
  listShortlistsByJob,
  listShortlistCandidates,
  listSharesByShortlist,
} from "@/features/recruiter/shortlists/data/shortlists.queries";
import { CrearShortlistForm } from "@/features/recruiter/shortlists/ui/CrearShortlistForm";
import { ShortlistCard } from "@/features/recruiter/shortlists/ui/ShortlistCard";

interface Props {
  params: Promise<{ id: string }>;
}

/** Pestaña Shortlists. La cabecera del workspace la pone el layout. */
export default async function ShortlistsPage({ params }: Props) {
  const { id: jobId } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  // URL base resuelta en el server (host de la request) y pasada como prop. Así el enlace
  // de share se renderiza idéntico en server y cliente -> sin mismatch de hidratación.
  const reqHeaders = await headers();
  const host = reqHeaders.get("host") ?? "";
  const proto = reqHeaders.get("x-forwarded-proto") ?? "http";
  const appUrl = host ? `${proto}://${host}` : "";

  const [applications, summaries] = await Promise.all([
    listApplicationsByJob(jobId, membership.organizationId),
    listShortlistsByJob(jobId, membership.organizationId),
  ]);

  const candidateOptions = applications.map((a) => ({
    applicationId: a.id,
    fullName: a.candidate.fullName,
    stage: STAGE_LABELS[a.stage],
  }));

  // Para cada shortlist, traemos candidatos (con feedback) y sus enlaces.
  const shortlists = await Promise.all(
    summaries.map(async (sl) => {
      const [candidates, shares] = await Promise.all([
        listShortlistCandidates(sl.id, membership.organizationId),
        listSharesByShortlist(sl.id, membership.organizationId),
      ]);
      return { ...sl, candidates, shares };
    }),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[60ch] text-sm text-muted">
          Compartí una selección de candidatos con la empresa por un enlace seguro.
        </p>
        <CrearShortlistForm jobId={jobId} candidates={candidateOptions} />
      </div>

      {shortlists.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-primary/25 bg-bg p-10 text-center text-sm text-muted">
          Todavía no creaste shortlists para esta búsqueda. Armá uno seleccionando
          candidatos del pipeline.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {shortlists.map((sl) => (
            <ShortlistCard
              key={sl.id}
              shortlistId={sl.id}
              jobId={jobId}
              name={sl.name}
              candidates={sl.candidates}
              shares={sl.shares}
              appUrl={appUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}
