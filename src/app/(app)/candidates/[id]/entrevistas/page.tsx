import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { listInterviewReportsForCandidate } from "@/features/recruiter/interview-reports/data/interview-reports.queries";
import { CandidateInterviewReports } from "@/features/recruiter/interview-reports/ui/CandidateInterviewReports";

/**
 * Pestaña Entrevistas: los informes de entrevista con IA del candidato, uno por búsqueda en la
 * que fue entrevistado. El candidato ya lo validó el layout de la ficha.
 */
export default async function CandidateEntrevistasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const reports = await listInterviewReportsForCandidate(id, membership.organizationId);

  if (reports.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-surface px-5 py-10 text-center shadow-[var(--shadow)]">
        <p className="text-sm text-muted">
          Todavía no hay informes de entrevista para este candidato. Se generan desde la ficha
          de cada entrevista, una vez que se realizó.
        </p>
      </div>
    );
  }

  return <CandidateInterviewReports reports={reports} />;
}
