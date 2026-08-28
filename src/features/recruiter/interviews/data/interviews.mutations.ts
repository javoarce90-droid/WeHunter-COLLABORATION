import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { interviews } from "@/db/schema";
import type { InterviewRow } from "../domain/agendar-entrevista";
import type { InterviewMode, InterviewStatus, InterviewType } from "../schema";

/** Escrituras de entrevistas. Cliente RLS; RLS garantiza el aislamiento por tenant. */

const returning = {
  id: interviews.id,
  organizationId: interviews.organizationId,
  applicationId: interviews.applicationId,
  scheduledAt: interviews.scheduledAt,
  mode: interviews.mode,
  type: interviews.type,
  location: interviews.location,
  notes: interviews.notes,
  status: interviews.status,
  participantEmails: interviews.participantEmails,
  googleEventId: interviews.googleEventId,
  googleSyncError: interviews.googleSyncError,
};

function toRow(r: {
  id: string;
  organizationId: string;
  applicationId: string;
  scheduledAt: Date;
  mode: string;
  type: string;
  location: string | null;
  notes: string | null;
  status: string;
  participantEmails: string[] | null;
  googleEventId: string | null;
  googleSyncError: string | null;
}): InterviewRow {
  return {
    id: r.id,
    organizationId: r.organizationId,
    applicationId: r.applicationId,
    scheduledAt: r.scheduledAt,
    mode: r.mode as InterviewMode,
    type: r.type as InterviewType,
    location: r.location,
    notes: r.notes,
    status: r.status as InterviewStatus,
    participantEmails: r.participantEmails ?? [],
    googleEventId: r.googleEventId,
    googleSyncError: r.googleSyncError,
  };
}

export async function insertInterview(data: {
  organizationId: string;
  applicationId: string;
  scheduledAt: Date;
  mode: InterviewMode;
  type: InterviewType;
  location: string | null;
  notes: string | null;
  participantEmails: string[];
  createdBy: string | null;
}): Promise<InterviewRow> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx.insert(interviews).values(data).returning(returning),
    "db.interviews.insert",
  );
  return toRow(rows[0]!);
}

export async function updateInterview(
  interviewId: string,
  data: {
    scheduledAt: Date;
    mode: InterviewMode;
    type: InterviewType;
    status: InterviewStatus;
    location: string | null;
    notes: string | null;
    participantEmails: string[];
  },
): Promise<InterviewRow> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .update(interviews)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(interviews.id, interviewId))
      .returning(returning),
    "db.interviews.update",
  );
  return toRow(rows[0]!);
}

/** Pasa la entrevista a "Realizada" — usado cuando generar el informe de entrevista es la
 *  señal de que ya se hizo, sin que el recruiter haya tocado el estado a mano. */
export async function markInterviewCompleted(interviewId: string): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(interviews)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(interviews.id, interviewId)),
    "db.interviews.mark-completed",
  );
}

export async function deleteInterview(interviewId: string): Promise<void> {
  const db = await getDb();
  await db.rls((tx) =>
    tx.delete(interviews).where(eq(interviews.id, interviewId)),
    "db.interviews.delete",
  );
}

/** Persiste el resultado de un intento de sync con Google Calendar (no toca otros campos). */
export async function updateInterviewGoogleSync(
  interviewId: string,
  sync: {
    googleEventId: string | null;
    googleSyncError: string | null;
    /** Google Meet autogenerado al crear el evento (entrevista remota sin location propia) —
     *  se guarda como location de la entrevista. undefined = no se pidió, no tocar location. */
    meetLink?: string | null;
  },
): Promise<void> {
  const { meetLink, ...rest } = sync;
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(interviews)
        .set({
          ...rest,
          ...(meetLink ? { location: meetLink } : {}),
          updatedAt: new Date(),
        })
        .where(eq(interviews.id, interviewId)),
    "db.interviews.google-sync",
  );
}
