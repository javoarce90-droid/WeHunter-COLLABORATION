import { Suspense } from "react";
import { getCurrentUser, getActiveMembership } from "@/lib/auth/session";
import { can } from "@/lib/auth/roles";
import {
  listAgendaInterviews,
  listSchedulableApplications,
} from "@/features/recruiter/interviews/data/interviews.queries";
import { listMembers } from "@/features/recruiter/team/data/team.queries";
import { getConnectionByProfile } from "@/features/recruiter/google-calendar/data/connections.queries";
import { isGoogleCalendarConfigured } from "@/features/recruiter/google-calendar/data/oauth-client";
import { AgendaView } from "@/features/recruiter/interviews/ui/AgendaView";
import { ListSkeleton } from "@/components/ui/list-skeleton";

/** El shell (título) pinta al instante; la agenda se streamea. */
export default function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Agenda</h1>
        <p className="text-sm text-muted">
          Tus entrevistas de todas las búsquedas, ordenadas por fecha.
        </p>
      </div>

      <Suspense fallback={<ListSkeleton />}>
        <AgendaSection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/** "yyyy-mm" → {year, month} válido, o el mes real actual si falta/es inválido. */
function parseMonth(raw: string | undefined): { year: number; month: number } {
  const match = raw?.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (month >= 1 && month <= 12) return { year, month };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

async function AgendaSection({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const [{ month: monthParam }, user, membership] = await Promise.all([
    searchParams,
    getCurrentUser(),
    getActiveMembership(),
  ]);
  if (!user || !membership) return <AgendaView {...emptyProps()} />;

  const canWrite = can(membership.role, "interviews.manage");
  const { year, month } = parseMonth(monthParam);

  const [interviews, googleConnection, schedulableApplications, members] = await Promise.all([
    listAgendaInterviews(membership.organizationId),
    getConnectionByProfile(user.id, membership.organizationId),
    canWrite ? listSchedulableApplications(membership.organizationId) : Promise.resolve([]),
    canWrite ? listMembers(membership.organizationId) : Promise.resolve([]),
  ]);

  const teamMembers = members
    .filter((m) => m.status === "active")
    .map((m) => ({ profileId: m.profileId, name: m.name, email: m.email }));

  return (
    <AgendaView
      interviews={interviews}
      year={year}
      month={month}
      canWrite={canWrite}
      googleConfigured={isGoogleCalendarConfigured()}
      googleConnectedEmail={googleConnection?.googleEmail ?? null}
      schedulableApplications={schedulableApplications}
      teamMembers={teamMembers}
    />
  );
}

function emptyProps() {
  const now = new Date();
  return {
    interviews: [],
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    canWrite: false,
    googleConfigured: false,
    googleConnectedEmail: null,
    schedulableApplications: [],
    teamMembers: [],
  };
}
