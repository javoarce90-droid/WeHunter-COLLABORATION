"use client";

import { Dialog } from "@/components/ui/dialog";
import { InterviewsSection } from "@/features/recruiter/interviews/ui/InterviewsSection";
import type { InterviewRow } from "@/features/recruiter/interviews/domain/agendar-entrevista";
import type { TeamMemberOption } from "@/features/recruiter/interviews/ui/InterviewForm";

type Props = {
  applicationId: string | null;
  jobId: string;
  candidateName: string;
  interviews: InterviewRow[];
  teamMembers: TeamMemberOption[];
  onClose: () => void;
};

/**
 * Diálogo rápido para agendar/gestionar entrevistas desde el menú de 3 puntos de una card
 * del pipeline, sin abrir la ficha completa. Reusa `InterviewsSection` tal cual (ya trae
 * listar/agendar/editar/eliminar) — este componente es solo el wrapper de `Dialog`.
 */
export function ScheduleInterviewDialog({
  applicationId,
  jobId,
  candidateName,
  interviews,
  teamMembers,
  onClose,
}: Props) {
  return (
    <Dialog
      open={applicationId != null}
      onClose={onClose}
      side="center"
      title={`Entrevistas de ${candidateName}`}
      className="max-w-md"
    >
      {applicationId && (
        <InterviewsSection
          applicationId={applicationId}
          jobId={jobId}
          interviews={interviews}
          teamMembers={teamMembers}
        />
      )}
    </Dialog>
  );
}
