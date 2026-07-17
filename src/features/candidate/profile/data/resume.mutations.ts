import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  candidateWorkExperiences,
  candidateEducation,
  candidateCertifications,
  candidateLanguages,
} from "@/db/schema";
import type { ResumeOwner } from "../domain/gestionar-experiencia";

/** WHERE del dueño (profile_id o candidate_id) para una de las tablas de currículum. */
function ownerFilter(
  table:
    | typeof candidateWorkExperiences
    | typeof candidateEducation
    | typeof candidateCertifications
    | typeof candidateLanguages,
  owner: ResumeOwner,
) {
  return owner.kind === "profile"
    ? eq(table.profileId, owner.profileId)
    : eq(table.candidateId, owner.candidateId);
}

function ownerColumns(owner: ResumeOwner) {
  return owner.kind === "profile"
    ? { profileId: owner.profileId, candidateId: null }
    : { profileId: null, candidateId: owner.candidateId };
}

// ---- Experiencia laboral ----

export interface ExperienceFields {
  company: string;
  position: string;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  employmentType: string | null;
  modality: string | null;
  skills: string[] | null;
}

export async function insertExperience(
  owner: ResumeOwner,
  data: ExperienceFields,
): Promise<{ id: string }> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .insert(candidateWorkExperiences)
        .values({ ...ownerColumns(owner), ...data } as typeof candidateWorkExperiences.$inferInsert)
        .returning({ id: candidateWorkExperiences.id }),
    "db.resume.insertExperience",
  );
  return rows[0];
}

export async function updateExperience(
  id: string,
  owner: ResumeOwner,
  data: ExperienceFields,
): Promise<boolean> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .update(candidateWorkExperiences)
        .set(data as Partial<typeof candidateWorkExperiences.$inferInsert>)
        .where(and(eq(candidateWorkExperiences.id, id), ownerFilter(candidateWorkExperiences, owner)))
        .returning({ id: candidateWorkExperiences.id }),
    "db.resume.updateExperience",
  );
  return rows.length > 0;
}

export async function deleteExperience(id: string, owner: ResumeOwner): Promise<boolean> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .delete(candidateWorkExperiences)
        .where(and(eq(candidateWorkExperiences.id, id), ownerFilter(candidateWorkExperiences, owner)))
        .returning({ id: candidateWorkExperiences.id }),
    "db.resume.deleteExperience",
  );
  return rows.length > 0;
}

// ---- Educación ----

export interface EducationFields {
  institution: string;
  degree: string;
  fieldOfStudy: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  grade: string | null;
  activities: string | null;
}

export async function insertEducation(
  owner: ResumeOwner,
  data: EducationFields,
): Promise<{ id: string }> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .insert(candidateEducation)
        .values({ ...ownerColumns(owner), ...data } as typeof candidateEducation.$inferInsert)
        .returning({ id: candidateEducation.id }),
    "db.resume.insertEducation",
  );
  return rows[0];
}

export async function updateEducation(
  id: string,
  owner: ResumeOwner,
  data: EducationFields,
): Promise<boolean> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .update(candidateEducation)
        .set(data as Partial<typeof candidateEducation.$inferInsert>)
        .where(and(eq(candidateEducation.id, id), ownerFilter(candidateEducation, owner)))
        .returning({ id: candidateEducation.id }),
    "db.resume.updateEducation",
  );
  return rows.length > 0;
}

export async function deleteEducation(id: string, owner: ResumeOwner): Promise<boolean> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .delete(candidateEducation)
        .where(and(eq(candidateEducation.id, id), ownerFilter(candidateEducation, owner)))
        .returning({ id: candidateEducation.id }),
    "db.resume.deleteEducation",
  );
  return rows.length > 0;
}

// ---- Certificaciones ----

export interface CertificationFields {
  name: string;
  url: string | null;
}

export async function insertCertification(
  owner: ResumeOwner,
  data: CertificationFields,
): Promise<{ id: string }> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .insert(candidateCertifications)
        .values({ ...ownerColumns(owner), ...data } as typeof candidateCertifications.$inferInsert)
        .returning({ id: candidateCertifications.id }),
    "db.resume.insertCertification",
  );
  return rows[0];
}

export async function deleteCertification(id: string, owner: ResumeOwner): Promise<boolean> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .delete(candidateCertifications)
        .where(and(eq(candidateCertifications.id, id), ownerFilter(candidateCertifications, owner)))
        .returning({ id: candidateCertifications.id }),
    "db.resume.deleteCertification",
  );
  return rows.length > 0;
}

// ---- Idiomas ----

export interface LanguageFields {
  language: string;
  level: string;
}

export async function insertLanguage(
  owner: ResumeOwner,
  data: LanguageFields,
): Promise<{ id: string }> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .insert(candidateLanguages)
        .values({ ...ownerColumns(owner), ...data } as typeof candidateLanguages.$inferInsert)
        .returning({ id: candidateLanguages.id }),
    "db.resume.insertLanguage",
  );
  return rows[0];
}

export async function deleteLanguage(id: string, owner: ResumeOwner): Promise<boolean> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .delete(candidateLanguages)
        .where(and(eq(candidateLanguages.id, id), ownerFilter(candidateLanguages, owner)))
        .returning({ id: candidateLanguages.id }),
    "db.resume.deleteLanguage",
  );
  return rows.length > 0;
}
