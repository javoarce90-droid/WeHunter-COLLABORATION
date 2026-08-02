"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import type { AgendaInterview, SchedulableApplication } from "../data/interviews.queries";
import { InterviewForm, type TeamMemberOption } from "./InterviewForm";

export type ScheduleModalMode = { type: "new" } | { type: "edit"; interview: AgendaInterview };

type Props = {
  open: boolean;
  onClose: () => void;
  mode: ScheduleModalMode;
  schedulableApplications: SchedulableApplication[];
  teamMembers: TeamMemberOption[];
};

const selectClass =
  "rounded-[var(--radius)] border border-border bg-bg px-2.5 py-1.5 text-sm text-text outline-none focus:border-primary disabled:opacity-50";

/**
 * Contenido del modal de Agenda, en sus dos modos:
 * - "new": selects en cascada Búsqueda→Candidato (solo candidatos ya en pipeline) y, recién
 *   al resolverse un `applicationId`, se monta `InterviewForm` — el mismo que ya usa el
 *   pipeline para agendar, sin duplicar sus campos.
 * - "edit": `InterviewForm` directo con la entrevista precargada, igual que hoy hace
 *   `InterviewsSection` al click en "Editar".
 */
export function ScheduleInterviewModal({
  open,
  onClose,
  mode,
  schedulableApplications,
  teamMembers,
}: Props) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  function handleClose() {
    setJobId(null);
    setApplicationId(null);
    onClose();
  }

  if (mode.type === "edit") {
    return (
      <Dialog open={open} onClose={handleClose} side="center" title="Detalle de la entrevista">
        <InterviewForm
          applicationId={mode.interview.applicationId}
          jobId={mode.interview.jobId}
          interview={mode.interview}
          teamMembers={teamMembers}
          onDone={handleClose}
        />
      </Dialog>
    );
  }

  const jobs = Array.from(
    new Map(schedulableApplications.map((a) => [a.jobId, a.jobTitle])).entries(),
  ).map(([id, title]) => ({ id, title }));
  const candidateOptions = jobId ? schedulableApplications.filter((a) => a.jobId === jobId) : [];

  return (
    <Dialog open={open} onClose={handleClose} side="center" title="Agendar entrevista">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted">
            Búsqueda
            <select
              value={jobId ?? ""}
              onChange={(e) => {
                setJobId(e.target.value || null);
                setApplicationId(null);
              }}
              className={selectClass}
            >
              <option value="">Elegí una búsqueda…</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted">
            Candidato (del pipeline)
            <select
              value={applicationId ?? ""}
              onChange={(e) => setApplicationId(e.target.value || null)}
              disabled={!jobId}
              className={selectClass}
            >
              <option value="">
                {jobId ? "Elegí un candidato…" : "Elegí primero una búsqueda"}
              </option>
              {candidateOptions.map((a) => (
                <option key={a.applicationId} value={a.applicationId}>
                  {a.candidateName}
                  {a.stageName ? ` · ${a.stageName}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        {jobId && candidateOptions.length === 0 ? (
          <p className="text-xs text-muted">
            Esta búsqueda todavía no tiene candidatos en su pipeline.
          </p>
        ) : (
          <p className="text-xs text-muted">
            Solo aparecen candidatos que ya están en el pipeline de esa búsqueda.
          </p>
        )}

        {jobId && applicationId && (
          <InterviewForm
            applicationId={applicationId}
            jobId={jobId}
            teamMembers={teamMembers}
            onDone={handleClose}
          />
        )}
      </div>
    </Dialog>
  );
}
