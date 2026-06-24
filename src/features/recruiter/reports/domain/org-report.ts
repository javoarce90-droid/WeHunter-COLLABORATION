import { APPLICATION_STAGES, type ApplicationStage } from "../../applications/schema";
import type { OrgReportRaw } from "../data/reports.queries";

export type OrgReport = {
  kpis: {
    totalJobs: number;
    openJobs: number;
    totalCandidates: number;
    totalApplications: number;
    hires: number;
    conversionPct: number;
  };
  funnel: { stage: ApplicationStage; count: number }[];
  sourceBreakdown: { source: string; count: number }[];
  trends: { week: string; count: number }[];
  timeToHireDays: number | null;
  perRecruiter: { name: string; jobs: number; hires: number }[];
};

const MS_PER_DAY = 86_400_000;
const round1 = (n: number) => Math.round(n * 10) / 10;

export function computeOrgReport(raw: OrgReportRaw): OrgReport {
  const totalJobs = raw.jobsByStatus.reduce((s, r) => s + r.count, 0);
  const openJobs = raw.jobsByStatus.find((r) => r.status === "open")?.count ?? 0;

  const stageMap = new Map(raw.stageCounts.map((r) => [r.stage, r.count]));
  const totalApplications = raw.stageCounts.reduce((s, r) => s + r.count, 0);
  const hires = stageMap.get("hired") ?? 0;

  const funnel = APPLICATION_STAGES.map((stage) => ({
    stage,
    count: stageMap.get(stage) ?? 0,
  }));

  const sourceBreakdown = raw.sourceCounts
    .map((r) => ({ source: r.source ?? "unknown", count: r.count }))
    .sort((a, b) => b.count - a.count);

  const timeToHireDays =
    raw.hireTimings.length > 0
      ? round1(
          raw.hireTimings.reduce(
            (s, t) => s + (t.hiredAt.getTime() - t.appCreated.getTime()),
            0,
          ) /
            raw.hireTimings.length /
            MS_PER_DAY,
        )
      : null;

  // Performance por recruiter: búsquedas que posee (jobs.created_by) + contrataciones en ellas.
  const hiresMap = new Map(raw.hiresByRecruiter.map((r) => [r.ownerId, r.count]));
  const perRecruiter = raw.jobsByRecruiter
    .map((r) => ({
      name: r.name ?? "Sin asignar",
      jobs: r.count,
      hires: hiresMap.get(r.ownerId) ?? 0,
    }))
    .sort((a, b) => b.hires - a.hires || b.jobs - a.jobs);

  return {
    kpis: {
      totalJobs,
      openJobs,
      totalCandidates: raw.candidatesCount,
      totalApplications,
      hires,
      conversionPct: totalApplications > 0 ? Math.round((hires / totalApplications) * 100) : 0,
    },
    funnel,
    sourceBreakdown,
    trends: raw.trends,
    timeToHireDays,
    perRecruiter,
  };
}
