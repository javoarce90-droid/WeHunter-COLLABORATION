import { Suspense } from "react";
import { getCurrentUser, getActiveMembership } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import {
  listAgendaInterviews,
  listInterviewConflictCandidates,
  listInterviewJobOptions,
  listSchedulableApplications,
  listJobStageOptionsByJob,
} from "@/features/recruiter/interviews/data/interviews.queries";
import { listMembers } from "@/features/recruiter/team/data/team.queries";
import { getConnectionByProfile } from "@/features/recruiter/google-calendar/data/connections.queries";
import { isGoogleCalendarConfigured } from "@/features/recruiter/google-calendar/data/oauth-client";
import { AgendaView } from "@/features/recruiter/interviews/ui/AgendaView";
import {
  agendaRangeBounds,
  isAgendaRange,
  DEFAULT_AGENDA_RANGE,
  type AgendaRange,
} from "@/features/recruiter/interviews/ui/agenda-filters";
import { ListSkeleton } from "@/components/ui/list-skeleton";

/** El shell (título) pinta al instante; la agenda se streamea. */
export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; q?: string; range?: string }>;
}) {
  const { job, q, range: rawRange } = await searchParams;
  const range: AgendaRange = isAgendaRange(rawRange) ? rawRange : DEFAULT_AGENDA_RANGE;
  const query = q ?? "";
  const jobId = job || undefined;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Agenda</h1>
        <p className="text-sm text-muted">
          Tus entrevistas de todas las búsquedas, ordenadas por fecha.
        </p>
      </div>

      <Suspense fallback={<ListSkeleton />}>
        <AgendaSection jobId={jobId} query={query} range={range} />
      </Suspense>
    </div>
  );
}

async function AgendaSection({
  jobId,
  query,
  range,
}: {
  jobId: string | undefined;
  query: string;
  range: AgendaRange;
}) {
  const [user, membership] = await Promise.all([getCurrentUser(), getActiveMembership()]);
  if (!user || !membership) return <AgendaView {...emptyProps()} />;

  const canWrite = can(membership.role, "interviews.manage");
  const { from, to } = agendaRangeBounds(range, new Date());

  const [
    interviews,
    jobOptions,
    conflictCandidates,
    googleConnection,
    schedulableApplications,
    members,
    jobStagesByJob,
  ] = await Promise.all([
    listAgendaInterviews(membership.organizationId, { jobId, q: query, from, to }),
    listInterviewJobOptions(membership.organizationId),
    canWrite
      ? listInterviewConflictCandidates(membership.organizationId)
      : Promise.resolve([]),
    getConnectionByProfile(user.id, membership.organizationId),
    canWrite ? listSchedulableApplications(membership.organizationId) : Promise.resolve([]),
    canWrite ? listMembers(membership.organizationId) : Promise.resolve([]),
    canWrite ? listJobStageOptionsByJob(membership.organizationId) : Promise.resolve({}),
  ]);

  const teamMembers = members
    .filter((m) => m.status === "active")
    .map((m) => ({ profileId: m.profileId, name: m.name, email: m.email }));

  return (
    <AgendaView
      interviews={interviews}
      jobOptions={jobOptions}
      conflictCandidates={conflictCandidates}
      filters={{ jobId: jobId ?? null, q: query }}
      range={range}
      canWrite={canWrite}
      googleConfigured={isGoogleCalendarConfigured()}
      googleConnectedEmail={googleConnection?.googleEmail ?? null}
      schedulableApplications={schedulableApplications}
      jobStagesByJob={jobStagesByJob}
      teamMembers={teamMembers}
    />
  );
}

function emptyProps() {
  return {
    interviews: [],
    jobOptions: [],
    conflictCandidates: [],
    filters: { jobId: null, q: "" },
    range: DEFAULT_AGENDA_RANGE,
    canWrite: false,
    googleConfigured: false,
    googleConnectedEmail: null,
    schedulableApplications: [],
    jobStagesByJob: {},
    teamMembers: [],
  };
}
