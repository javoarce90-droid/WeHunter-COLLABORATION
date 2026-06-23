import { and, eq, asc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { interviews, applications } from "@/db/schema";
import type { InterviewRow } from "../domain/agendar-entrevista";
import type { InterviewMode, InterviewStatus } from "../schema";

/** Lecturas de entrevistas. Cliente RLS; filtramos siempre por organization activa. */

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

const columns = {
  id: interviews.id,
  organizationId: interviews.organizationId,
  applicationId: interviews.applicationId,
  scheduledAt: interviews.scheduledAt,
  mode: interviews.mode,
  location: interviews.location,
  notes: interviews.notes,
  status: interviews.status,
};

/** Verifica que la application exista y pertenezca a la org (para agendar). */
export async function getApplicationForInterview(
  applicationId: string,
  organizationId: string,
): Promise<{ id: string } | null> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({ id: applications.id })
      .from(applications)
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.organizationId, organizationId),
        ),
      )
      .limit(1),
    "db.interviews.app-for-interview",
  );
  return rows[0] ?? null;
}

export async function getInterviewById(
  interviewId: string,
  organizationId: string,
): Promise<InterviewRow | null> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select(columns)
      .from(interviews)
      .where(
        and(
          eq(interviews.id, interviewId),
          eq(interviews.organizationId, organizationId),
        ),
      )
      .limit(1),
    "db.interviews.get",
  );
  return rows[0] ? toRow(rows[0]) : null;
}

/**
 * Todas las entrevistas de un job (a través de sus applications), para pintarlas en el
 * pipeline. Una sola query con join; el caller las agrupa por applicationId (evita N+1).
 */
export async function listInterviewsByJob(
  jobId: string,
  organizationId: string,
): Promise<InterviewRow[]> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select(columns)
      .from(interviews)
      .innerJoin(applications, eq(interviews.applicationId, applications.id))
      .where(
        and(
          eq(applications.jobId, jobId),
          eq(interviews.organizationId, organizationId),
        ),
      )
      .orderBy(asc(interviews.scheduledAt)),
    "db.interviews.by-job",
  );
  return rows.map(toRow);
}
