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
import { listMembers } from "@/features/recruiter/team/data/team.queries";
import { listInterviewsByJob } from "@/features/recruiter/interviews/data/interviews.queries";
import type { InterviewRow } from "@/features/recruiter/interviews/domain/agendar-entrevista";
import { getJobById } from "@/features/recruiter/jobs/data/jobs.queries";
import { CrearShortlistForm } from "@/features/recruiter/shortlists/ui/CrearShortlistForm";
import { ShortlistCard } from "@/features/recruiter/shortlists/ui/ShortlistCard";
import { EmptyState } from "@/components/ui/empty-state";

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

  const [job, applications, summaries, members, jobInterviews] = await Promise.all([
    getJobById(jobId, membership.organizationId), // cache() por request: gratis (ya lo pidió el layout)
    listApplicationsByJob(jobId, membership.organizationId),
    listShortlistsByJob(jobId, membership.organizationId),
    listMembers(membership.organizationId),
    listInterviewsByJob(jobId, membership.organizationId),
  ]);
  if (!job) notFound();

  const teamMembers = members
    .filter((m) => m.status === "active")
    .map((m) => ({ profileId: m.profileId, name: m.name, email: m.email }));

  const interviewsByApplication = jobInterviews.reduce<Record<string, InterviewRow[]>>((acc, it) => {
    (acc[it.applicationId] ??= []).push(it);
    return acc;
  }, {});

  const candidateOptions = applications.map((a) => ({
    applicationId: a.id,
    fullName: a.candidate.fullName,
    stage: STAGE_LABELS[a.stage],
  }));

  // Compartir con HM solo existe en Enterprise (§9) — ahí es donde el rol tiene sentido.
  const hmOptions =
    membership.workspaceType === "enterprise"
      ? members
          .filter((m) => m.status === "active" && m.role === "hiring_manager")
          .map((m) => ({ membershipId: m.membershipId, name: m.name ?? m.email }))
      : [];

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
        <EmptyState
          title="Todavía no hay shortlists"
          description="Armá uno seleccionando candidatos del pipeline y compartilo con la empresa por un enlace seguro."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {shortlists.map((sl) => (
            <ShortlistCard
              key={sl.id}
              shortlistId={sl.id}
              jobId={jobId}
              jobTitle={job.title}
              name={sl.name}
              candidates={sl.candidates}
              shares={sl.shares}
              appUrl={appUrl}
              hmOptions={hmOptions}
              teamMembers={teamMembers}
              interviewsByApplication={interviewsByApplication}
            />
          ))}
        </div>
      )}
    </div>
  );
}
