import type { ApplicationStage } from "@/features/recruiter/applications/schema";
import type { FeedbackDecision } from "./registrar-feedback";

/**
 * Ficha completa de un candidato de shortlist — forma común entre los 3 caminos que la
 * consumen (Cliente por token, Hiring Manager por sesión, Recruiter): alimenta el mismo
 * componente de detalle (`ShortlistCandidateDetailSheet`). Cada camino arma este shape desde
 * su propia fuente de datos (RPC por token vs queries RLS) — ver `shortlist-review.data.ts`
 * y `shortlists.queries.ts`.
 */

export type ShortlistExperience = {
  id: string;
  company: string;
  position: string;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
};

export type ShortlistEducation = {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string | null;
};

export type ShortlistLanguage = {
  id: string;
  language: string;
  level: string;
};

export type ShortlistScreeningAnswer = {
  questionId: string;
  label: string;
  value: string;
};

export type ShortlistInterviewHistoryItem = {
  id: string;
  scheduledAt: string;
  mode: string;
  type: string;
  status: string;
};

export type ShortlistCandidateCommentItem = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string | null;
};

export type ShortlistCandidateDetailData = {
  shortlistCandidateId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedinUrl: string | null;
  summary: string | null;
  skills: string[];
  /** Link de descarga ya resuelto (firmado para el Cliente, ruta interna para HM/recruiter). */
  cvHref: string | null;
  stage: ApplicationStage;
  feedbackDecision: FeedbackDecision | null;
  feedbackComment: string | null;
  interviewRequestedAt: string | null;
  interviewRequestedSlots: string[] | null;
  experiences: ShortlistExperience[];
  education: ShortlistEducation[];
  languages: ShortlistLanguage[];
  screening: ShortlistScreeningAnswer[];
  interviews: ShortlistInterviewHistoryItem[];
  comments: ShortlistCandidateCommentItem[];
};
