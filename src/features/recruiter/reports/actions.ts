"use server";

import { getActiveMembership } from "@/lib/auth/session";
import { getAiProvider } from "@/lib/ai";
import { getJobById } from "../jobs/data/jobs.queries";
import { CANDIDATE_SOURCE_LABELS } from "../candidates/ui/source-meta";
import type { CandidateSource } from "../candidates/domain/candidate-details";
import { getJobReportData } from "./data/reports.queries";
import { computeJobPerformance } from "./domain/job-performance";

function sourceLabel(source: string | null): string | null {
  if (!source) return null;
  if (source === "unknown") return "sin especificar";
  return CANDIDATE_SOURCE_LABELS[source as CandidateSource] ?? source;
}

/** Genera (IA mock) un resumen narrativo del rendimiento de la búsqueda. */
export async function generarInsightsAction(
  jobId: string,
): Promise<{ ok: boolean; insights?: string; error?: string }> {
  const membership = await getActiveMembership();
  if (!membership) return { ok: false, error: "No autorizado." };

  const [job, raw] = await Promise.all([
    getJobById(jobId, membership.organizationId),
    getJobReportData(jobId, membership.organizationId),
  ]);
  if (!job) return { ok: false, error: "Búsqueda no encontrada." };

  const perf = computeJobPerformance({ ...raw, now: new Date() });
  const hired = perf.funnel.find((f) => f.stage === "hired")?.count ?? 0;

  const insights = await getAiProvider().reportInsights({
    jobTitle: job.title,
    total: perf.totalApplications,
    hired,
    timeToHireDays: perf.timeToHireDays,
    topSource: sourceLabel(perf.sourceBreakdown[0]?.source ?? null),
  });

  return { ok: true, insights };
}
