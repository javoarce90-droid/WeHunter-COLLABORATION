"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import {
  agregarExperiencia,
  editarExperiencia,
  eliminarExperiencia,
  type ResumeOwner,
} from "./domain/gestionar-experiencia";
import { agregarEducacion, editarEducacion, eliminarEducacion } from "./domain/gestionar-educacion";
import { agregarCertificacion, eliminarCertificacion } from "./domain/gestionar-certificacion";
import {
  insertExperience,
  updateExperience,
  deleteExperience,
  insertEducation,
  updateEducation,
  deleteEducation,
  insertCertification,
  deleteCertification,
} from "./data/resume.mutations";

export interface ResumeActionState {
  error?: string;
}

async function ownProfileOwner(): Promise<ResumeOwner | null> {
  const user = await getCurrentUser();
  return user ? { kind: "profile", profileId: user.id } : null;
}

const readStr = (formData: FormData, key: string) => {
  const v = formData.get(key);
  return typeof v === "string" && v ? v : undefined;
};

// ---- Experiencia laboral ----

export async function agregarExperienciaAction(
  _prev: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const owner = await ownProfileOwner();
  if (!owner) return { error: "No tenés sesión activa." };

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

  revalidatePath("/c/profile");
  return {};
}

export async function editarExperienciaAction(
  _prev: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const owner = await ownProfileOwner();
  if (!owner) return { error: "No tenés sesión activa." };

  const id = String(formData.get("id") ?? "");
  const result = await editarExperiencia(
    id,
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

  revalidatePath("/c/profile");
  return {};
}

export async function eliminarExperienciaAction(
  _prev: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const owner = await ownProfileOwner();
  if (!owner) return { error: "No tenés sesión activa." };

  const result = await eliminarExperiencia(String(formData.get("id") ?? ""), owner, {
    deleteExperience,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/c/profile");
  return {};
}

// ---- Educación ----

export async function agregarEducacionAction(
  _prev: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const owner = await ownProfileOwner();
  if (!owner) return { error: "No tenés sesión activa." };

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

  revalidatePath("/c/profile");
  return {};
}

export async function editarEducacionAction(
  _prev: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const owner = await ownProfileOwner();
  if (!owner) return { error: "No tenés sesión activa." };

  const id = String(formData.get("id") ?? "");
  const result = await editarEducacion(
    id,
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

  revalidatePath("/c/profile");
  return {};
}

export async function eliminarEducacionAction(
  _prev: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const owner = await ownProfileOwner();
  if (!owner) return { error: "No tenés sesión activa." };

  const result = await eliminarEducacion(String(formData.get("id") ?? ""), owner, {
    deleteEducation,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/c/profile");
  return {};
}

// ---- Certificaciones ----

export async function agregarCertificacionAction(
  _prev: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const owner = await ownProfileOwner();
  if (!owner) return { error: "No tenés sesión activa." };

  const result = await agregarCertificacion(
    {
      name: String(formData.get("name") ?? ""),
      url: readStr(formData, "url"),
    },
    owner,
    { insertCertification },
  );
  if (!result.ok) return { error: result.error };

  revalidatePath("/c/profile");
  return {};
}

export async function eliminarCertificacionAction(
  _prev: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const owner = await ownProfileOwner();
  if (!owner) return { error: "No tenés sesión activa." };

  const result = await eliminarCertificacion(String(formData.get("id") ?? ""), owner, {
    deleteCertification,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/c/profile");
  return {};
}
