/**
 * Filtros del listado de candidatos. Módulo neutro (sin "use client") para que lo importen
 * tanto la page (server) como CandidatesList (client), mismo rol que job-filters.ts en Jobs.
 */

import type { JobSeniority } from "@/features/recruiter/jobs/domain/job-details";
import { SENIORITY_LABELS } from "@/features/recruiter/jobs/ui/field-meta";
import { TALENT_STATE_LABELS } from "./talent-meta";
import type { CandidateFilterKey, CompletenessFilter } from "../data/candidates.queries";

export const CANDIDATE_SENIORITY_OPTIONS = Object.entries(SENIORITY_LABELS) as [
  JobSeniority,
  string,
][];

export function isCandidateSeniority(
  value: string | undefined,
): value is JobSeniority {
  return value !== undefined && value in SENIORITY_LABELS;
}

export const CANDIDATE_COMPLETENESS_LABELS: Record<CompletenessFilter, string> = {
  complete: "Completo (≥70%)",
  incomplete: "Incompleto (<40%)",
};

export const CANDIDATE_COMPLETENESS_OPTIONS = Object.entries(
  CANDIDATE_COMPLETENESS_LABELS,
) as [CompletenessFilter, string][];

export function isCompletenessFilter(
  value: string | undefined,
): value is CompletenessFilter {
  return value !== undefined && value in CANDIDATE_COMPLETENESS_LABELS;
}

export const CANDIDATE_STATUS_FILTERS: { key: CandidateFilterKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "active", label: TALENT_STATE_LABELS.active },
  { key: "passive", label: TALENT_STATE_LABELS.passive },
  { key: "contacted", label: TALENT_STATE_LABELS.contacted },
  { key: "archived", label: TALENT_STATE_LABELS.archived },
  { key: "duplicates", label: "Duplicados" },
];
