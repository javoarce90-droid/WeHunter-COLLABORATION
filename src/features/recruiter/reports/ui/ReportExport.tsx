"use client";

import { Button } from "@/components/ui/button";
import { STAGE_LABELS } from "@/features/recruiter/applications/schema";
import { CANDIDATE_SOURCE_LABELS } from "@/features/recruiter/candidates/ui/source-meta";
import type { CandidateSource } from "@/features/recruiter/candidates/domain/candidate-details";
import type { ApplicationStage } from "@/features/recruiter/applications/schema";
import type { OrgReport } from "../domain/org-report";

function sourceLabel(source: string): string {
  if (source === "unknown") return "Sin especificar";
  return CANDIDATE_SOURCE_LABELS[source as CandidateSource] ?? source;
}

/** Escapa un valor para CSV (comillas + separador + saltos de línea). */
function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsv(report: OrgReport, period: string): string {
  const lines: string[] = [];
  const row = (...cells: (string | number)[]) => lines.push(cells.map(csvCell).join(","));

  row("Reporte WeHunter", `Período: ${period}`);
  row("");
  row("KPI", "Valor");
  row("Búsquedas totales", report.kpis.totalJobs);
  row("Búsquedas abiertas", report.kpis.openJobs);
  row("Candidatos", report.kpis.totalCandidates);
  row("Postulaciones", report.kpis.totalApplications);
  row("Contrataciones", report.kpis.hires);
  row("Conversión %", report.kpis.conversionPct);
  row("Time-to-hire (días)", report.timeToHireDays ?? "—");
  row("");
  row("Funnel — Etapa", "Candidatos");
  for (const f of report.funnel) row(STAGE_LABELS[f.stage as ApplicationStage], f.count);
  row("");
  row("Fuente", "Candidatos");
  for (const s of report.sourceBreakdown) row(sourceLabel(s.source), s.count);
  row("");
  row("Recruiter", "Búsquedas", "Contrataciones");
  for (const r of report.perRecruiter) row(r.name, r.jobs, r.hires);

  return lines.join("\n");
}

export function ReportExport({ report, period }: { report: OrgReport; period: string }) {
  function download() {
    const csv = buildCsv(report, period);
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-wehunter-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="secondary" size="sm" onClick={download}>
      Exportar CSV
    </Button>
  );
}
