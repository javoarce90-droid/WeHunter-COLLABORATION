import { Card } from "@/components/ui/card";
import type { InterviewRow } from "@/features/recruiter/interviews/domain/agendar-entrevista";
import type { TeamMemberOption } from "@/features/recruiter/interviews/ui/InterviewForm";
import type { ShortlistCandidateWithFeedback, ShareRow } from "../data/shortlists.queries";
import { ShareControls, type HMOption } from "./ShareControls";
import { ShortlistCardCandidates } from "./ShortlistCardCandidates";

type Props = {
  shortlistId: string;
  jobId: string;
  jobTitle: string;
  name: string;
  candidates: ShortlistCandidateWithFeedback[];
  shares: ShareRow[];
  appUrl: string;
  hmOptions: HMOption[];
  teamMembers: TeamMemberOption[];
  interviewsByApplication: Record<string, InterviewRow[]>;
};

export function ShortlistCard({
  shortlistId,
  jobId,
  jobTitle,
  name,
  candidates,
  shares,
  appUrl,
  hmOptions,
  teamMembers,
  interviewsByApplication,
}: Props) {
  return (
    <Card>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-text">{name}</h3>
          <span className="text-xs text-muted">
            {candidates.length} candidato{candidates.length !== 1 ? "s" : ""}
          </span>
        </div>

        <ShortlistCardCandidates
          shortlistId={shortlistId}
          jobId={jobId}
          jobTitle={jobTitle}
          candidates={candidates}
          teamMembers={teamMembers}
          interviewsByApplication={interviewsByApplication}
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
