import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { EmptyState } from "@/components/ui/empty-state";
import { getJobReportData } from "@/features/recruiter/reports/data/reports.queries";
import { computeJobPerformance } from "@/features/recruiter/reports/domain/job-performance";
import { FunnelChart } from "@/features/recruiter/dashboard/ui/FunnelChart";
import { SourceBreakdown } from "@/features/recruiter/reports/ui/SourceBreakdown";
import { StageTiming } from "@/features/recruiter/reports/ui/StageTiming";
import { ReportInsights } from "@/features/recruiter/reports/ui/ReportInsights";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Pestaña Rendimiento: analytics de la búsqueda. El job ya está validado por el layout.
 * Una sola transacción RLS trae los datos crudos; el cálculo vive en domain (testeable).
 */
export default async function RendimientoPage({ params }: Props) {
  const { id: jobId } = await params;
  const membership = await getActiveMembership();
  if (!membership) notFound();

  const raw = await getJobReportData(jobId, membership.organizationId);
  const perf = computeJobPerformance({ ...raw, now: new Date() });

  // Sin candidatos no hay nada que graficar: un solo empty state a nivel tab en vez de
  // tres paneles vacíos repitiendo "todavía no hay…".
  if (perf.totalApplications === 0) {
    return (
      <EmptyState
        title="Todavía no hay datos de rendimiento"
        description={
          <>
            Postulá candidatos desde el{" "}
            <span className="font-semibold text-text">Pipeline</span> y las métricas
            (funnel, origen, tiempos) se arman solas a medida que avanza el proceso.
          </>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <FunnelChart funnel={perf.funnel} />
        <SourceBreakdown breakdown={perf.sourceBreakdown} />
      </div>
      <StageTiming perf={perf} />
      <ReportInsights jobId={jobId} />
    </div>
  );
}
