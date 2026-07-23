import { postularEnPortalAction, type PortalApplyState } from "../actions";
import { type Job } from "../data/mock-jobs";

export type ApplyCandidate = { fullName: string; email: string };

export async function enviarPostulacionPortal(
  job: Job,
  candidate: ApplyCandidate,
  answers: Record<string, string>,
): Promise<PortalApplyState> {
  const formData = new FormData();
  formData.set("jobId", job.id);
  formData.set("organizationId", job.organizationId);
  formData.set("fullName", candidate.fullName.trim());
  formData.set("email", candidate.email.trim());

  const screeningAnswers = Object.entries(answers)
    .filter(([, value]) => value.trim())
    .map(([questionId, value]) => ({ questionId, value }));
  if (screeningAnswers.length > 0) {
    formData.set("screeningAnswers", JSON.stringify(screeningAnswers));
  }

  return postularEnPortalAction({}, formData);
}
