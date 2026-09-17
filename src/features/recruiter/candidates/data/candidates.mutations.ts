import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  candidates,
  candidateWorkExperiences,
  candidateEducation,
  candidateCertifications,
  candidateLanguages,
} from "@/db/schema";
import type { CandidateDetails } from "../domain/candidate-details";
import type { TalentState } from "../domain/cambiar-estado-talento";
import { mapearNivelIdioma } from "../domain/mapear-nivel-idioma";
import { parseResumeDateToDb } from "../domain/parse-resume-date";
import type {
  ExperienceFields,
  EducationFields,
  CertificationFields,
  LanguageFields,
} from "@/features/candidate/profile/data/resume.mutations";

/** Escrituras del pool de candidatos. Cliente RLS; el organizationId acota a la org activa. */

export async function setTalentState(
  candidateId: string,
  talentState: TalentState,
): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(candidates)
        .set({ talentState, updatedAt: new Date() })
        .where(eq(candidates.id, candidateId)),
    "db.candidates.set-talent-state",
  );
}

/** Suma (o saca, con `value: false` — el "Deshacer" del guardado) el candidato al pool de
 *  talento del recruiter (ver comentario en el schema: `saved_to_pool`). No toca nada de
 *  ninguna postulación — es del candidato, no de un job. */
export async function setSavedToPool(
  candidateId: string,
  value = true,
): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(candidates)
        .set({ savedToPool: value, updatedAt: new Date() })
        .where(eq(candidates.id, candidateId)),
    "db.candidates.set-saved-to-pool",
  );
}

export async function insertCandidate(
  args: {
    organizationId: string;
    fullName: string;
    email: string | null;
    cvUrl: string | null;
    profileId?: string | null;
  } & CandidateDetails,
): Promise<{ candidateId: string }> {
  const db = await getDb();
  const { organizationId, fullName, email, cvUrl, profileId, ...details } = args;
  const rows = await db.rls((tx) =>
    tx
      .insert(candidates)
      .values({ organizationId, fullName, email, cvUrl, profileId: profileId ?? null, ...details })
      .returning({ id: candidates.id }),
    "db.candidates.insert",
  );
  return { candidateId: rows[0]!.id };
}

/** Insert en lote de la importación masiva — un solo statement para todas las filas válidas
 *  del archivo, no un insert por fila (database.md regla #3). */
export async function insertCandidatesBatch(
  organizationId: string,
  candidatesToInsert: {
    fullName: string;
    email: string;
    phone: string | null;
    location: string | null;
    linkedinUrl: string | null;
    headline: string | null;
    skills: string[] | null;
  }[],
): Promise<{ inserted: number }> {
  if (candidatesToInsert.length === 0) return { inserted: 0 };
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .insert(candidates)
        .values(
          candidatesToInsert.map((c) => ({
            organizationId,
            fullName: c.fullName,
            email: c.email,
            phone: c.phone,
            location: c.location,
            linkedinUrl: c.linkedinUrl,
            headline: c.headline,
            skills: c.skills,
            source: "manual" as const,
          })),
        )
        .returning({ id: candidates.id }),
    "db.candidates.insert-batch",
  );
  return { inserted: rows.length };
}

/** Currículum estructurado a persistir para un candidato del pool (no de autoservicio) — mismo
 *  criterio que `persistOnboardingDraft` (`candidate/onboarding/data/persist-onboarding-draft.mutations.ts`)
 *  pero con `candidateId` en vez de `profileId`. `languages[].level` viaja en texto libre (lo
 *  que devuelva el proveedor, ej. HarvestAPI) — `insertCandidateResume` lo mapea al enum
 *  `languageLevel` con `mapearNivelIdioma`, quien llama no tiene que mapearlo antes. */
export interface CandidateResumeFields {
  workExperiences: ExperienceFields[];
  education: EducationFields[];
  certifications: CertificationFields[];
  languages: (Omit<LanguageFields, "level"> & { level: string | null })[];
}

/**
 * Guarda de una sola vez el currículum estructurado de un candidato del pool: experiencia +
 * educación + certificaciones + idiomas. UNA transacción (no una por tabla), mismo motivo que
 * `persistOnboardingDraft` (database.md regla "una transacción, no N"). Pensada para el import
 * de un resultado de Sourcing con datos reales de HarvestAPI — no se llama para candidatos sin
 * currículum estructurado (Serper, carga manual).
 */
export async function insertCandidateResume(
  candidateId: string,
  resume: CandidateResumeFields,
): Promise<void> {
  if (
    resume.workExperiences.length === 0 &&
    resume.education.length === 0 &&
    resume.certifications.length === 0 &&
    resume.languages.length === 0
  ) {
    return;
  }
  const db = await getDb();
  await db.rls(async (tx) => {
    if (resume.workExperiences.length > 0) {
      await tx.insert(candidateWorkExperiences).values(
        resume.workExperiences.map(
          (e) =>
            ({
              profileId: null,
              candidateId,
              ...e,
              // `date` en Postgres exige día completo — el proveedor de Sourcing da texto
              // libre ("Mar 2025", "2004"), ver parse-resume-date.ts.
              startDate: parseResumeDateToDb(e.startDate),
              endDate: parseResumeDateToDb(e.endDate),
            }) as typeof candidateWorkExperiences.$inferInsert,
        ),
      );
    }
    if (resume.education.length > 0) {
      await tx.insert(candidateEducation).values(
        resume.education.map(
          (e) =>
            ({
              profileId: null,
              candidateId,
              ...e,
              startDate: parseResumeDateToDb(e.startDate),
              endDate: parseResumeDateToDb(e.endDate),
            }) as typeof candidateEducation.$inferInsert,
        ),
      );
    }
    if (resume.certifications.length > 0) {
      await tx.insert(candidateCertifications).values(
        resume.certifications.map(
          (c) => ({ profileId: null, candidateId, ...c }) as typeof candidateCertifications.$inferInsert,
        ),
      );
    }
    if (resume.languages.length > 0) {
      await tx.insert(candidateLanguages).values(
        resume.languages.map(
          (l) =>
            ({
              profileId: null,
              candidateId,
              language: l.language,
              level: mapearNivelIdioma(l.level),
            }) as typeof candidateLanguages.$inferInsert,
        ),
      );
    }
  }, "db.candidates.insert-resume");
}

export async function updateCandidateFields(
  candidateId: string,
  organizationId: string,
  // cvUrl ausente (undefined) = conservar el CV existente.
  fields: { fullName: string; email: string | null; cvUrl?: string } & CandidateDetails,
): Promise<{ updated: boolean }> {
  const db = await getDb();
  const { cvUrl, ...rest } = fields;
  const set = {
    ...rest,
    updatedAt: new Date(),
    ...(cvUrl !== undefined ? { cvUrl } : {}),
  };
  const rows = await db.rls((tx) =>
    tx
      .update(candidates)
      .set(set)
      .where(
        and(
          eq(candidates.id, candidateId),
          eq(candidates.organizationId, organizationId),
        ),
      )
      .returning({ id: candidates.id }),
    "db.candidates.update",
  );
  return { updated: rows.length > 0 };
}
