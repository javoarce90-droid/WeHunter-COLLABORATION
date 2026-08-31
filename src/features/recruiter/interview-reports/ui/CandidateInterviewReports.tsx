"use client";

import { useState } from "react";
import { SparkleIcon } from "@/components/ui/ai";
import { InterviewReportView } from "./InterviewReportView";
import type { CandidateInterviewReport } from "../data/interview-reports.queries";

const dateFmt = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/**
 * Los informes de entrevista del candidato en la pestaña Entrevistas de su ficha, uno por
 * búsqueda. Con más de uno se muestran colapsables (el más reciente abierto); con uno solo,
 * abierto directo.
 */
export function CandidateInterviewReports({
  reports,
}: {
  reports: CandidateInterviewReport[];
}) {
  const [openId, setOpenId] = useState<string | null>(
    reports.length === 1 ? reports[0].interviewId : reports[0]?.interviewId ?? null,
  );

  return (
    <div className="flex flex-col gap-3">
      {reports.map((r) => {
        const open = openId === r.interviewId;
        return (
          <div
            key={r.interviewId}
            className="overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]"
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : r.interviewId)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ai">
                  <SparkleIcon size={11} /> Informe de entrevista
                </span>
                <span className="truncate text-sm font-bold text-text">{r.jobTitle}</span>
                <span className="text-xs text-muted">
                  Entrevista del {dateFmt.format(r.interviewDate)} · {r.interviewerName}
                </span>
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
                aria-hidden
              >
                <path d="m4 6 4 4 4-4" />
              </svg>
            </button>
            {open && (
              <div className="border-t border-border px-5 py-5">
                <InterviewReportView report={r.report} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
