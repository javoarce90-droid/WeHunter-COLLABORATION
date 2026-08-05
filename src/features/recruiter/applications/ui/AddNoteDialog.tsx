"use client";

import { Dialog } from "@/components/ui/dialog";
import { NoteTimeline } from "@/features/recruiter/notes/ui/NoteTimeline";
import type { TimelineNote } from "@/features/recruiter/notes/data/notes.queries";

type Props = {
  applicationId: string | null;
  jobId: string;
  candidateName: string;
  notes: TimelineNote[];
  onClose: () => void;
};

/**
 * Diálogo rápido para agregar una nota desde el menú de 3 puntos de una card del pipeline,
 * sin abrir la ficha completa. Reusa `NoteTimeline` tal cual (lista + alta).
 */
export function AddNoteDialog({ applicationId, jobId, candidateName, notes, onClose }: Props) {
  return (
    <Dialog
      open={applicationId != null}
      onClose={onClose}
      side="center"
      title={`Notas de ${candidateName}`}
      className="max-w-md"
    >
      {applicationId && (
        <NoteTimeline applicationId={applicationId} jobId={jobId} notes={notes} />
      )}
    </Dialog>
  );
}
