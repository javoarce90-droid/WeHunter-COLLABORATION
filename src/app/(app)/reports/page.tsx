import { notFound } from "next/navigation";
import { getActiveMembership } from "@/lib/auth/session";
import { getOrgReportData } from "@/features/recruiter/reports/data/reports.queries";
import { computeOrgReport } from "@/features/recruiter/reports/domain/org-report";
import { FunnelChart } from "@/features/recruiter/dashboard/ui/FunnelChart";
import { SourceBreakdown } from "@/features/recruiter/reports/ui/SourceBreakdown";
import { TrendChart } from "@/features/recruiter/reports/ui/TrendChart";
import {
  PeriodFilter,
  periodSince,
  isPeriodKey,
  PERIODS,
  type PeriodKey,
} from "@/features/recruiter/reports/ui/PeriodFilter";
import { ReportExport } from "@/features/recruiter/reports/ui/ReportExport";

interface Props {
  searchParams: Promise<{ period?: string }>;
}

export default async function ReportsPage({ searchParams }: Props) {
  const { period: rawPeriod } = await searchParams;
  const period: PeriodKey = isPeriodKey(rawPeriod) ? rawPeriod : "30d";

  const membership = await getActiveMembership();
  if (!membership) notFound();

  const since = periodSince(period, new Date());
  const raw = await getOrgReportData(membership.organizationId, since);
  const report = computeOrgReport(raw);
  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? period;

  const kpis: { label: string; value: string }[] = [
    { label: "Búsquedas abiertas", value: String(report.kpis.openJobs) },
    { label: "Candidatos en pool", value: String(report.kpis.totalCandidates) },
    { label: "Postulaciones", value: String(report.kpis.totalApplications) },
    { label: "Contrataciones", value: String(report.kpis.hires) },
    { label: "Conversión", value: `${report.kpis.conversionPct}%` },
    {
      label: "Time-to-hire",
      value: report.timeToHireDays != null ? `${report.timeToHireDays} d` : "—",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-bold text-text">Reportes</h1>
        <p className="text-sm text-muted">
          Métricas de todo tu workspace · {periodLabel.toLowerCase()}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodFilter current={period} />
        <ReportExport report={report} period={period} />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="rounded-[var(--radius)] border border-border bg-surface p-4 shadow-[var(--shadow)]"
          >
            <p className="text-xs font-medium text-muted">{k.label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-text tabular-nums">
              {k.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FunnelChart funnel={report.funnel} />
        <SourceBreakdown breakdown={report.sourceBreakdown} />
      </div>

      <TrendChart trends={report.trends} />

      {/* Performance por recruiter */}
      <section className="rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow)]">
        <h2 className="mb-4 text-sm font-bold text-text">Performance por recruiter</h2>
        {report.perRecruiter.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">
            Todavía no hay búsquedas asignadas a recruiters.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 text-xs font-semibold uppercase tracking-wide text-label">
                  Recruiter
                </th>
                <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-label">
                  Búsquedas
                </th>
                <th className="pb-2 text-right text-xs font-semibold uppercase tracking-wide text-label">
                  Contrataciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {report.perRecruiter.map((r) => (
                <tr key={r.name}>
                  <td className="py-2 font-medium text-text">{r.name}</td>
                  <td className="py-2 text-right text-muted tabular-nums">{r.jobs}</td>
                  <td className="py-2 text-right font-semibold text-text tabular-nums">
                    {r.hires}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
