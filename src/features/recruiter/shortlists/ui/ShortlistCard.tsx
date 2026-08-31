import { Card } from "@/components/ui/card";
import type { InterviewRow } from "@/features/recruiter/interviews/domain/agendar-entrevista";
import type { JobStageOption } from "@/features/recruiter/interviews/data/interviews.queries";
import type { TeamMemberOption } from "@/features/recruiter/interviews/ui/InterviewForm";
import type { ShortlistCandidateWithFeedback, ShareRow } from "../data/shortlists.queries";
import { ShareControls, type HMOption } from "./ShareControls";
import { ShortlistCardCandidates } from "./ShortlistCardCandidates";
import { AgregarCandidatosDialog } from "./AgregarCandidatosDialog";

type CandidateOption = { applicationId: string; fullName: string; stage: string };

const dateFmt = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" });

type Props = {
  shortlistId: string;
  jobId: string;
  jobTitle: string;
  name: string;
  createdAt: Date;
  candidates: ShortlistCandidateWithFeedback[];
  shares: ShareRow[];
  appUrl: string;
  hmOptions: HMOption[];
  jobStages: JobStageOption[];
  teamMembers: TeamMemberOption[];
  interviewsByApplication: Record<string, InterviewRow[]>;
  /** Postulaciones del pipeline que todavía no están en esta shortlist ("+ Agregar candidato"). */
  availableCandidates: CandidateOption[];
};

export function ShortlistCard({
  shortlistId,
  jobId,
  jobTitle,
  name,
  createdAt,
  candidates,
  shares,
  appUrl,
  hmOptions,
  jobStages,
  teamMembers,
  interviewsByApplication,
  availableCandidates,
}: Props) {
  return (
    <Card>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 className="font-semibold text-text">{name}</h3>
          <span className="text-xs text-muted">
            {candidates.length} candidato{candidates.length !== 1 ? "s" : ""}
            <span aria-hidden> · </span>
            creada el {dateFmt.format(createdAt)}
          </span>
        </div>

        <ShortlistCardCandidates
          shortlistId={shortlistId}
          jobId={jobId}
          jobTitle={jobTitle}
          candidates={candidates}
          jobStages={jobStages}
          teamMembers={teamMembers}
          interviewsByApplication={interviewsByApplication}
        />

        <AgregarCandidatosDialog
          shortlistId={shortlistId}
          jobId={jobId}
          available={availableCandidates}
        />

        <ShareControls
          shortlistId={shortlistId}
          jobId={jobId}
          shares={shares}
          appUrl={appUrl}
          hmOptions={hmOptions}
        />
      </div>
    </Card>
  );
}
