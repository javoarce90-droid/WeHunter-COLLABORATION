import { Suspense } from "react";
import { getActiveMembership } from "@/lib/auth/session";
import { listAgendaInterviews } from "@/features/recruiter/interviews/data/interviews.queries";
import { AgendaView } from "@/features/recruiter/interviews/ui/AgendaView";
import { ListSkeleton } from "@/components/ui/list-skeleton";

/** El shell (título) pinta al instante; la agenda se streamea. */
export default function AgendaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Agenda</h1>
        <p className="text-sm text-muted">
          Tus entrevistas de todas las búsquedas, ordenadas por fecha.
        </p>
      </div>

      <Suspense fallback={<ListSkeleton />}>
        <AgendaSection />
      </Suspense>
    </div>
  );
}

async function AgendaSection() {
  const membership = await getActiveMembership();
  const interviews = membership
    ? await listAgendaInterviews(membership.organizationId)
    : [];
  return <AgendaView interviews={interviews} />;
}
