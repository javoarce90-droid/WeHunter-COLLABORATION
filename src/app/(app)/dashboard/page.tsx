import { Card, CardContent } from "@/components/ui/card";
import { getActiveMembership } from "@/lib/auth/session";
import { obtenerKpis } from "@/features/recruiter/dashboard/domain/obtener-kpis";
import {
  getJobCounts,
  getCandidateCount,
  getApplicationCountsByStage,
} from "@/features/recruiter/dashboard/data/dashboard.queries";
import { KpiGrid } from "@/features/recruiter/dashboard/ui/KpiGrid";

/** Dashboard del reclutador: KPIs de su workspace (Slice 1). */
export default async function DashboardPage() {
  const membership = await getActiveMembership();
  const result = await obtenerKpis(
    { organizationId: membership?.organizationId ?? null },
    { getJobCounts, getCandidateCount, getApplicationCountsByStage },
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-bold text-text">Dashboard</h1>
        <p className="text-sm text-muted">Resumen de tu workspace.</p>
      </div>

      {result.ok ? (
        <>
          <KpiGrid kpis={result.data} />
          <p className="text-xs text-muted">
            Las entrevistas próximas se incorporan cuando esté el módulo de
            entrevistas.
          </p>
        </>
      ) : (
        <Card>
          <CardContent>
            <p className="text-sm text-danger">{result.error}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
