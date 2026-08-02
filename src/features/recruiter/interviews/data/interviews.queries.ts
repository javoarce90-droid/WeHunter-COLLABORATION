import { and, eq, asc, count, gte, lt, isNotNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { interviews, applications, candidates, jobs, jobStages } from "@/db/schema";
import type { InterviewRow } from "../domain/agendar-entrevista";
import type { InterviewMode, InterviewStatus, InterviewType } from "../schema";

/** Lecturas de entrevistas. Cliente RLS; filtramos siempre por organization activa. */

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

const columns = {
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

/** Candidato + búsqueda de una application, para armar el título/descripción del evento de Calendar. */
export async function getInterviewSyncContext(
  applicationId: string,
  organizationId: string,
): Promise<{ candidateName: string; candidateEmail: string | null; jobTitle: string } | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          candidateName: candidates.fullName,
          candidateEmail: candidates.email,
          jobTitle: jobs.title,
        })
        .from(applications)
        .innerJoin(candidates, eq(applications.candidateId, candidates.id))
        .innerJoin(jobs, eq(applications.jobId, jobs.id))
        .where(
          and(
            eq(applications.id, applicationId),
            eq(applications.organizationId, organizationId),
          ),
        )
        .limit(1),
    "db.interviews.sync-context",
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

/**
 * Entrevista con el contexto que necesita la agenda: el resto de sus campos (participantes,
 * notas, sync de Calendar) para poder editarla desde ahí sin un segundo fetch por click.
 */
export type AgendaInterview = InterviewRow & {
  jobId: string;
  jobTitle: string;
  candidateId: string;
  candidateName: string;
};

/**
 * Todas las entrevistas de la org con su candidato y búsqueda, para la Agenda. Una query con
 * joins (sin N+1); ordenada por fecha. Usa el índice `interviews_org_scheduled_idx`.
 */
export async function listAgendaInterviews(
  organizationId: string,
): Promise<AgendaInterview[]> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({
        ...columns,
        jobId: jobs.id,
        jobTitle: jobs.title,
        candidateId: candidates.id,
        candidateName: candidates.fullName,
      })
      .from(interviews)
      .innerJoin(applications, eq(interviews.applicationId, applications.id))
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .innerJoin(candidates, eq(applications.candidateId, candidates.id))
      .where(eq(interviews.organizationId, organizationId))
      .orderBy(asc(interviews.scheduledAt))
      .limit(200),
    "db.interviews.agenda",
  );
  return rows.map((r) => ({
    ...toRow(r),
    jobId: r.jobId,
    jobTitle: r.jobTitle,
    candidateId: r.candidateId,
    candidateName: r.candidateName,
  }));
}

/** Candidato agendable: ya está en el pipeline de esa búsqueda (mismo criterio que
 *  `listApplicationsByJob`). Alimenta el selector Búsqueda→Candidato del modal de Agenda. */
export type SchedulableApplication = {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  candidateId: string;
  candidateName: string;
  stageName: string | null;
};

export async function listSchedulableApplications(
  organizationId: string,
): Promise<SchedulableApplication[]> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({
        applicationId: applications.id,
        jobId: jobs.id,
        jobTitle: jobs.title,
        candidateId: candidates.id,
        candidateName: candidates.fullName,
        stageName: jobStages.name,
      })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .innerJoin(candidates, eq(applications.candidateId, candidates.id))
      .leftJoin(jobStages, eq(applications.stageId, jobStages.id))
      .where(
        and(
          eq(applications.organizationId, organizationId),
          isNotNull(applications.pipelineEnteredAt),
        ),
      )
      .orderBy(asc(jobs.title), asc(candidates.fullName))
      .limit(500),
    "db.interviews.schedulable-applications",
  );
  return rows;
}

export type UpcomingInterview = {
  id: string;
  scheduledAt: Date;
  type: InterviewType;
  mode: InterviewMode;
  jobTitle: string;
  candidateName: string;
};

export type DashboardAgendaSummary = {
  /** Las próximas entrevistas (futuras), para el widget del dashboard. */
  next: UpcomingInterview[];
  /** Cuántas caen hoy — para la tarjeta de acción rápida "Agenda de hoy". */
  todayCount: number;
};

/** Resumen de agenda para el dashboard: una sola transacción para el mini-listado y el
 *  contador de hoy (database.md regla #3). */
export async function getDashboardAgendaSummary(
  organizationId: string,
): Promise<DashboardAgendaSummary> {
  const db = await getDb();
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  return db.rls(async (tx) => {
    const [nextRows, todayRows] = await Promise.all([
      tx
        .select({
          id: interviews.id,
          scheduledAt: interviews.scheduledAt,
          type: interviews.type,
          mode: interviews.mode,
          jobTitle: jobs.title,
          candidateName: candidates.fullName,
        })
        .from(interviews)
        .innerJoin(applications, eq(interviews.applicationId, applications.id))
        .innerJoin(jobs, eq(applications.jobId, jobs.id))
        .innerJoin(candidates, eq(applications.candidateId, candidates.id))
        .where(and(eq(interviews.organizationId, organizationId), gte(interviews.scheduledAt, now)))
        .orderBy(asc(interviews.scheduledAt))
        .limit(3),
      tx
        .select({ n: count() })
        .from(interviews)
        .where(
          and(
            eq(interviews.organizationId, organizationId),
            gte(interviews.scheduledAt, startOfToday),
            lt(interviews.scheduledAt, startOfTomorrow),
          ),
        ),
    ]);

    return {
      next: nextRows.map((r) => ({
        ...r,
        type: r.type as InterviewType,
        mode: r.mode as InterviewMode,
      })),
      todayCount: Number(todayRows[0]?.n ?? 0),
    };
  }, "db.interviews.dashboard-summary");
}
