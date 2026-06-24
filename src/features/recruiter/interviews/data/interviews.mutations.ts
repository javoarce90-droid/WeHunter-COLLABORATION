import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { interviews } from "@/db/schema";
import type { InterviewRow } from "../domain/agendar-entrevista";
import type { InterviewMode, InterviewStatus } from "../schema";

/** Escrituras de entrevistas. Cliente RLS; RLS garantiza el aislamiento por tenant. */

const returning = {
  id: interviews.id,
  organizationId: interviews.organizationId,
  applicationId: interviews.applicationId,
  scheduledAt: interviews.scheduledAt,
  mode: interviews.mode,
  location: interviews.location,
  notes: interviews.notes,
  status: interviews.status,
};

function toRow(r: {
  id: string;
  organizationId: string;
  applicationId: string;
  scheduledAt: Date;
  mode: string;
  location: string | null;
  notes: string | null;
  status: string;
}): InterviewRow {
  return {
    id: r.id,
    organizationId: r.organizationId,
    applicationId: r.applicationId,
    scheduledAt: r.scheduledAt,
    mode: r.mode as InterviewMode,
    location: r.location,
    notes: r.notes,
    status: r.status as InterviewStatus,
  };
}

export async function insertInterview(data: {
  organizationId: string;
  applicationId: string;
  scheduledAt: Date;
  mode: InterviewMode;
  location: string | null;
  notes: string | null;
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
    status: InterviewStatus;
    location: string | null;
    notes: string | null;
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

export async function deleteInterview(interviewId: string): Promise<void> {
  const db = await getDb();
  await db.rls((tx) =>
    tx.delete(interviews).where(eq(interviews.id, interviewId)),
    "db.interviews.delete",
  );
}
