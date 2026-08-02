"use server";

import { revalidatePath } from "next/cache";
import { getActiveMembership } from "@/lib/auth/session";
import {
  agregarExperiencia,
  editarExperiencia,
  eliminarExperiencia,
  type ResumeOwner,
} from "@/features/candidate/profile/domain/gestionar-experiencia";
import {
  agregarEducacion,
  editarEducacion,
  eliminarEducacion,
} from "@/features/candidate/profile/domain/gestionar-educacion";
import {
  agregarCertificacion,
  eliminarCertificacion,
} from "@/features/candidate/profile/domain/gestionar-certificacion";
import {
  agregarIdioma,
  eliminarIdioma,
} from "@/features/candidate/profile/domain/gestionar-idioma";
import {
  insertExperience,
  updateExperience,
  deleteExperience,
  insertEducation,
  updateEducation,
  deleteEducation,
  insertCertification,
  deleteCertification,
  insertLanguage,
  deleteLanguage,
} from "@/features/candidate/profile/data/resume.mutations";
import { getCandidateById } from "./data/candidates.queries";

/**
 * Mismo dominio/data que el autoservicio del candidato (candidate/profile/), parametrizado
 * por candidate_id en vez de profile_id — es la nota de sourcing del recruiter en su pool,
 * nunca se fusiona con el perfil real del candidato (ver plan). is_org_member vía
 * getActiveMembership() + getCandidateById es la autorización primaria; RLS es la de fondo.
 */

export interface ResumeActionState {
  error?: string;
}

async function candidateOwner(candidateId: string): Promise<ResumeOwner | null> {
  const membership = await getActiveMembership();
  if (!membership) return null;
  const candidate = await getCandidateById(candidateId, membership.organizationId);
  if (!candidate) return null;
  return { kind: "candidate", candidateId };
}

const readStr = (formData: FormData, key: string) => {
  const v = formData.get(key);
  return typeof v === "string" && v ? v : undefined;
};

function revalidateCandidate(candidateId: string) {
  revalidatePath(`/candidates/${candidateId}`);
}

// ---- Experiencia laboral ----

export async function agregarExperienciaRecruiterAction(
  _prev: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const candidateId = String(formData.get("candidateId") ?? "");
  const owner = await candidateOwner(candidateId);
  if (!owner) return { error: "No autorizado." };

  const result = await agregarExperiencia(
    {
      company: String(formData.get("company") ?? ""),
      position: String(formData.get("position") ?? ""),
      startDate: readStr(formData, "startDate"),
      endDate: readStr(formData, "endDate"),
      description: readStr(formData, "description"),
      employmentType: readStr(formData, "employmentType") as never,
      modality: readStr(formData, "modality") as never,
      skills: readStr(formData, "skills"),
    },
    owner,
    { insertExperience },
  );
  if (!result.ok) return { error: result.error };

  revalidateCandidate(candidateId);
  return {};
}

export async function editarExperienciaRecruiterAction(
  _prev: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const candidateId = String(formData.get("candidateId") ?? "");
  const owner = await candidateOwner(candidateId);
  if (!owner) return { error: "No autorizado." };

  const result = await editarExperiencia(
    String(formData.get("id") ?? ""),
    {
      company: String(formData.get("company") ?? ""),
      position: String(formData.get("position") ?? ""),
      startDate: readStr(formData, "startDate"),
      endDate: readStr(formData, "endDate"),
      description: readStr(formData, "description"),
      employmentType: readStr(formData, "employmentType") as never,
      modality: readStr(formData, "modality") as never,
      skills: readStr(formData, "skills"),
    },
    owner,
    { updateExperience },
  );
  if (!result.ok) return { error: result.error };

  revalidateCandidate(candidateId);
  return {};
}

export async function eliminarExperienciaRecruiterAction(
  _prev: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const candidateId = String(formData.get("candidateId") ?? "");
  const owner = await candidateOwner(candidateId);
  if (!owner) return { error: "No autorizado." };

  const result = await eliminarExperiencia(String(formData.get("id") ?? ""), owner, {
    deleteExperience,
  });
  if (!result.ok) return { error: result.error };

  revalidateCandidate(candidateId);
  return {};
}

// ---- Educación ----

export async function agregarEducacionRecruiterAction(
  _prev: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const candidateId = String(formData.get("candidateId") ?? "");
  const owner = await candidateOwner(candidateId);
  if (!owner) return { error: "No autorizado." };

  const result = await agregarEducacion(
    {
      institution: String(formData.get("institution") ?? ""),
      degree: String(formData.get("degree") ?? ""),
      fieldOfStudy: readStr(formData, "fieldOfStudy"),
      startDate: readStr(formData, "startDate"),
      endDate: readStr(formData, "endDate"),
      description: readStr(formData, "description"),
      grade: readStr(formData, "grade"),
      activities: readStr(formData, "activities"),
    },
    owner,
    { insertEducation },
  );
  if (!result.ok) return { error: result.error };

  revalidateCandidate(candidateId);
  return {};
}

export async function editarEducacionRecruiterAction(
  _prev: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const candidateId = String(formData.get("candidateId") ?? "");
  const owner = await candidateOwner(candidateId);
  if (!owner) return { error: "No autorizado." };

  const result = await editarEducacion(
    String(formData.get("id") ?? ""),
    {
      institution: String(formData.get("institution") ?? ""),
      degree: String(formData.get("degree") ?? ""),
      fieldOfStudy: readStr(formData, "fieldOfStudy"),
      startDate: readStr(formData, "startDate"),
      endDate: readStr(formData, "endDate"),
      description: readStr(formData, "description"),
      grade: readStr(formData, "grade"),
      activities: readStr(formData, "activities"),
    },
    owner,
    { updateEducation },
  );
  if (!result.ok) return { error: result.error };

  revalidateCandidate(candidateId);
  return {};
}

export async function eliminarEducacionRecruiterAction(
  _prev: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const candidateId = String(formData.get("candidateId") ?? "");
  const owner = await candidateOwner(candidateId);
  if (!owner) return { error: "No autorizado." };

  const result = await eliminarEducacion(String(formData.get("id") ?? ""), owner, {
    deleteEducation,
  });
  if (!result.ok) return { error: result.error };

  revalidateCandidate(candidateId);
  return {};
}

// ---- Certificaciones ----

export async function agregarCertificacionRecruiterAction(
  _prev: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const candidateId = String(formData.get("candidateId") ?? "");
  const owner = await candidateOwner(candidateId);
  if (!owner) return { error: "No autorizado." };

  const result = await agregarCertificacion(
    { name: String(formData.get("name") ?? ""), url: readStr(formData, "url") },
    owner,
    { insertCertification },
  );
  if (!result.ok) return { error: result.error };

  revalidateCandidate(candidateId);
  return {};
}

export async function eliminarCertificacionRecruiterAction(
  _prev: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const candidateId = String(formData.get("candidateId") ?? "");
  const owner = await candidateOwner(candidateId);
  if (!owner) return { error: "No autorizado." };

  const result = await eliminarCertificacion(String(formData.get("id") ?? ""), owner, {
    deleteCertification,
  });
  if (!result.ok) return { error: result.error };

  revalidateCandidate(candidateId);
  return {};
}

// ---- Idiomas ----

export async function agregarIdiomaRecruiterAction(
  _prev: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const candidateId = String(formData.get("candidateId") ?? "");
  const owner = await candidateOwner(candidateId);
  if (!owner) return { error: "No autorizado." };

  const result = await agregarIdioma(
    {
      language: String(formData.get("language") ?? ""),
      level: String(formData.get("level") ?? ""),
    },
    owner,
    { insertLanguage },
  );
  if (!result.ok) return { error: result.error };

  revalidateCandidate(candidateId);
  return {};
}

export async function eliminarIdiomaRecruiterAction(
  _prev: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const candidateId = String(formData.get("candidateId") ?? "");
  const owner = await candidateOwner(candidateId);
  if (!owner) return { error: "No autorizado." };

  const result = await eliminarIdioma(String(formData.get("id") ?? ""), owner, {
    deleteLanguage,
  });
  if (!result.ok) return { error: result.error };

  revalidateCandidate(candidateId);
  return {};
}
