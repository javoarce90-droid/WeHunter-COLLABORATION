import { and, eq, asc, count, gte, lt, isNotNull, ne, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { interviews, applications, candidates, jobs, jobStages } from "@/db/schema";
import type { InterviewRow } from "../domain/agendar-entrevista";
import type { InterviewMode, InterviewStatus, InterviewType } from "../schema";
import { createKeyedCache } from "@/lib/keyed-cache";

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
// Ver keyed-cache.ts: dedupea `listInterviewsByJob` ENTRE requests — Pipeline y Shortlists la
// piden por separado al cambiar de tab. Invalidar con
// `invalidateInterviewsCache(jobId, organizationId)` en cualquier alta/edición/cancelación.
const interviewsByJobCache = createKeyedCache<InterviewRow[]>(30_000);

function interviewsByJobCacheKey(jobId: string, organizationId: string): string {
  return `${organizationId}:${jobId}`;
}

export function invalidateInterviewsCache(jobId: string, organizationId: string): void {
  interviewsByJobCache.invalidate(interviewsByJobCacheKey(jobId, organizationId));
}

export async function listInterviewsByJob(
  jobId: string,
  organizationId: string,
): Promise<InterviewRow[]> {
  const key = interviewsByJobCacheKey(jobId, organizationId);
  const cached = interviewsByJobCache.get(key);
  if (cached !== undefined) return cached;

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
      .orderBy(asc(interviews.scheduledAt))
      .limit(500),
    "db.interviews.by-job",
  );
  const result = rows.map(toRow);
  interviewsByJobCache.set(key, result);
  return result;
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

export type ShortlistInterviewSummary = {
  id: string;
  scheduledAt: Date;
  mode: InterviewMode;
  type: InterviewType;
  status: InterviewStatus;
};

/** Historial liviano de entrevistas de UNA postulación — para el detalle que ve el Cliente
 *  o el Hiring Manager (sin `notes`, que es interna del equipo). */
export async function listInterviewsByApplication(
  applicationId: string,
  organizationId: string,
): Promise<ShortlistInterviewSummary[]> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          id: interviews.id,
          scheduledAt: interviews.scheduledAt,
          mode: interviews.mode,
          type: interviews.type,
          status: interviews.status,
        })
        .from(interviews)
        .where(
          and(
            eq(interviews.applicationId, applicationId),
            eq(interviews.organizationId, organizationId),
          ),
        )
        .orderBy(asc(interviews.scheduledAt)),
    "db.interviews.by-application",
  );
  return rows.map((r) => ({
    ...r,
    mode: r.mode as InterviewMode,
    type: r.type as InterviewType,
    status: r.status as InterviewStatus,
  }));
}

/** Candidato agendable: ya está en el pipeline de esa búsqueda (mismo criterio que
 *  `listApplicationsByJob`) y ya pasó la primera etapa en proceso (la de menor `position`
 *  entre las `kind = 'in_process'` del job — "Preseleccionado" por defecto, el nombre lo
 *  elige el recruiter). Agendar una entrevista no tiene sentido antes de la preselección.
 *  Alimenta el selector Búsqueda→Candidato del modal de Agenda. */
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
          sql`not exists (
            select 1 from job_stages js1
            where js1.id = ${applications.stageId}
              and js1.kind = 'in_process'
              and js1.position = (
                select min(js2.position) from job_stages js2
                where js2.job_id = js1.job_id and js2.kind = 'in_process'
              )
          )`,
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

export type JobStageOption = { id: string; name: string };

/** Etapas del pipeline de UN job, para el selector "Tipo" al agendar — ya no es un enum
 *  fijo, lista las etapas reales de esa búsqueda (ver InterviewForm). Excluye "inbox"
 *  (bandeja, no es una etapa de entrevista) — mismo criterio que `getJobStageCounts`. */
export async function listJobStageOptions(
  jobId: string,
  organizationId: string,
): Promise<JobStageOption[]> {
  const db = await getDb();
  return db.rls(
    (tx) =>
      tx
        .select({ id: jobStages.id, name: jobStages.name })
        .from(jobStages)
        .where(
          and(
            eq(jobStages.jobId, jobId),
            eq(jobStages.organizationId, organizationId),
            ne(jobStages.kind, "inbox"),
          ),
        )
        .orderBy(asc(jobStages.position)),
    "db.interviews.job-stage-options",
  );
}

/** Igual que `listJobStageOptions` pero para TODOS los jobs con candidatos agendables de la
 *  org (agenda org-wide) — una sola query agrupada, no una por job (database.md #3). */
export async function listJobStageOptionsByJob(
  organizationId: string,
): Promise<Record<string, JobStageOption[]>> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({ jobId: jobStages.jobId, id: jobStages.id, name: jobStages.name })
        .from(jobStages)
        .where(and(eq(jobStages.organizationId, organizationId), ne(jobStages.kind, "inbox")))
        .orderBy(asc(jobStages.position)),
    "db.interviews.job-stage-options-by-job",
  );
  return rows.reduce<Record<string, JobStageOption[]>>((acc, r) => {
    (acc[r.jobId] ??= []).push({ id: r.id, name: r.name });
    return acc;
  }, {});
}
