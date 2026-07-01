import { and, eq, desc, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { applications, applicationEvents, candidates, jobs, type Job } from "@/db/schema";
import { APPLICATION_STAGES, type ApplicationStage } from "../schema";

/** Lecturas del pipeline. Cliente RLS; filtramos siempre por organization activa. */

export type ApplicationWithCandidate = {
  id: string;
  organizationId: string;
  jobId: string;
  candidateId: string;
  stage: ApplicationStage;
  aiScore: number | null;
  aiSummary: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  candidate: {
    id: string;
    fullName: string;
    email: string | null;
    cvUrl: string | null;
  };
};

export async function listApplicationsByJob(
  jobId: string,
  organizationId: string,
): Promise<ApplicationWithCandidate[]> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({
        id: applications.id,
        organizationId: applications.organizationId,
        jobId: applications.jobId,
        candidateId: applications.candidateId,
        stage: applications.stage,
        aiScore: applications.aiScore,
        aiSummary: applications.aiSummary,
        notes: applications.notes,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        candidateId2: candidates.id,
        candidateFullName: candidates.fullName,
        candidateEmail: candidates.email,
        candidateCvUrl: candidates.cvUrl,
      })
      .from(applications)
      .innerJoin(candidates, eq(applications.candidateId, candidates.id))
      .where(
        and(
          eq(applications.jobId, jobId),
          eq(applications.organizationId, organizationId),
        ),
      ),
    "db.applications.by-job",
  );
  return rows.map((r) => ({
    id: r.id,
    organizationId: r.organizationId,
    jobId: r.jobId,
    candidateId: r.candidateId,
    stage: r.stage as ApplicationStage,
    aiScore: r.aiScore,
    aiSummary: r.aiSummary,
    notes: r.notes,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    candidate: {
      id: r.candidateId2,
      fullName: r.candidateFullName,
      email: r.candidateEmail,
      cvUrl: r.candidateCvUrl,
    },
  }));
}

export async function getApplicationById(
  applicationId: string,
  organizationId: string,
): Promise<{ id: string; organizationId: string; jobId: string; candidateId: string; stage: ApplicationStage; createdAt: Date; updatedAt: Date } | null> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select()
      .from(applications)
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.organizationId, organizationId),
        ),
      )
      .limit(1),
    "db.applications.get",
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: r.id,
    organizationId: r.organizationId,
    jobId: r.jobId,
    candidateId: r.candidateId,
    stage: r.stage as ApplicationStage,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export async function findExistingApplication(
  jobId: string,
  candidateId: string,
): Promise<{ id: string } | null> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({ id: applications.id })
      .from(applications)
      .where(
        and(
          eq(applications.jobId, jobId),
          eq(applications.candidateId, candidateId),
        ),
      )
      .limit(1),
    "db.applications.find-existing",
  );
  return rows[0] ?? null;
}

/** Una participación del candidato: en qué búsqueda está y en qué etapa. */
export type CandidateApplication = {
  id: string;
  jobId: string;
  jobTitle: string;
  jobStatus: Job["status"];
  stage: ApplicationStage;
  createdAt: Date;
  aiScore: number | null;
  aiSummary: string | null;
};

/**
 * Búsquedas en las que participa un candidato (su huella en pipelines). Una query con join.
 * Filtra por `applications.candidate_id`, cubierto por el índice `applications_candidate_idx`.
 */
export async function listApplicationsByCandidate(
  candidateId: string,
  organizationId: string,
): Promise<CandidateApplication[]> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({
        id: applications.id,
        jobId: applications.jobId,
        jobTitle: jobs.title,
        jobStatus: jobs.status,
        stage: applications.stage,
        createdAt: applications.createdAt,
        aiScore: applications.aiScore,
        aiSummary: applications.aiSummary,
      })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(
        and(
          eq(applications.candidateId, candidateId),
          eq(applications.organizationId, organizationId),
        ),
      )
      .orderBy(desc(applications.createdAt))
      .limit(100),
    "db.applications.by-candidate",
  );
  return rows.map((r) => ({ ...r, stage: r.stage as ApplicationStage }));
}

/** Fila del inbox de Postulados: postulación + datos del candidato para triage. */
export type PostuladoRow = {
  id: string;
  stage: ApplicationStage;
  isFavorite: boolean;
  aiScore: number | null;
  aiSummary: string | null;
  createdAt: Date;
  candidate: {
    id: string;
    fullName: string;
    email: string | null;
    source: string | null;
  };
};

/**
 * Postulados de una búsqueda para la tabla de triage. Trae fuente y favorito (que el
 * pipeline no necesita). Una query con join; ordena por favorito y fecha. Con límite.
 */
export async function listPostulados(
  jobId: string,
  organizationId: string,
): Promise<PostuladoRow[]> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({
        id: applications.id,
        stage: applications.stage,
        isFavorite: applications.isFavorite,
        aiScore: applications.aiScore,
        aiSummary: applications.aiSummary,
        createdAt: applications.createdAt,
        candidateId: candidates.id,
        candidateFullName: candidates.fullName,
        candidateEmail: candidates.email,
        candidateSource: candidates.source,
      })
      .from(applications)
      .innerJoin(candidates, eq(applications.candidateId, candidates.id))
      .where(
        and(
          eq(applications.jobId, jobId),
          eq(applications.organizationId, organizationId),
        ),
      )
      .orderBy(desc(applications.isFavorite), desc(applications.createdAt))
      .limit(200),
    "db.applications.postulados",
  );
  return rows.map((r) => ({
    id: r.id,
    stage: r.stage as ApplicationStage,
    isFavorite: r.isFavorite,
    aiScore: r.aiScore,
    aiSummary: r.aiSummary,
    createdAt: r.createdAt,
    candidate: {
      id: r.candidateId,
      fullName: r.candidateFullName,
      email: r.candidateEmail,
      source: r.candidateSource,
    },
  }));
}

/** Datos de los candidatos de un job para puntuar con IA (skills, perfil, CV). */
export type ScoringRow = {
  id: string;
  candidate: {
    id: string;
    skills: string[] | null;
    summary: string | null;
    source: string | null;
    hasCv: boolean;
  };
};

export async function listApplicationsForScoring(
  jobId: string,
  organizationId: string,
): Promise<ScoringRow[]> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({
        id: applications.id,
        candidateId: candidates.id,
        skills: candidates.skills,
        summary: candidates.summary,
        source: candidates.source,
        cvUrl: candidates.cvUrl,
      })
      .from(applications)
      .innerJoin(candidates, eq(applications.candidateId, candidates.id))
      .where(
        and(
          eq(applications.jobId, jobId),
          eq(applications.organizationId, organizationId),
        ),
      )
      .limit(200),
    "db.applications.for-scoring",
  );
  return rows.map((r) => ({
    id: r.id,
    candidate: {
      id: r.candidateId,
      skills: r.skills,
      summary: r.summary,
      source: r.source,
      hasCv: r.cvUrl != null,
    },
  }));
}

export type StageCounts = Record<ApplicationStage, number>;

/** Cantidad de candidatos por etapa para una búsqueda. Una query agrupada (database.md #3). */
export async function getJobStageCounts(
  jobId: string,
  organizationId: string,
): Promise<StageCounts> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({
        stage: applications.stage,
        count: sql<number>`count(*)::int`,
      })
      .from(applications)
      .where(
        and(
          eq(applications.jobId, jobId),
          eq(applications.organizationId, organizationId),
        ),
      )
      .groupBy(applications.stage),
    "db.applications.stage-counts",
  );
  const counts = Object.fromEntries(
    APPLICATION_STAGES.map((s) => [s, 0]),
  ) as StageCounts;
  for (const r of rows) counts[r.stage as ApplicationStage] = r.count;
  return counts;
}

/**
 * Para cada postulación del job, retorna cuándo entró a su etapa actual.
 * Se usa para calcular el SLA risk en las cards del pipeline.
 * Fallback: si no hay evento (candidato nunca movido), usar application.createdAt en el llamador.
 */
export async function getStageEntryTimes(
  jobId: string,
  organizationId: string,
): Promise<Record<string, Date>> {
  const db = await getDb();
  // Une application_events con applications para filtrar por job y por etapa actual.
  // eq() entre dos columnas genera `col_a = col_b` en SQL.
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          applicationId: applicationEvents.applicationId,
          createdAt: applicationEvents.createdAt,
        })
        .from(applicationEvents)
        .innerJoin(
          applications,
          eq(applicationEvents.applicationId, applications.id),
        )
        .where(
          and(
            eq(applications.jobId, jobId),
            eq(applications.organizationId, organizationId),
            // Solo eventos donde to_stage = stage actual de la postulación.
            eq(applicationEvents.toStage, applications.stage),
          ),
        )
        .orderBy(desc(applicationEvents.createdAt)),
    "db.applications.stage-entry-times",
  );

  const result: Record<string, Date> = {};
  for (const r of rows) {
    // orderBy DESC + first-seen = el evento más reciente por applicationId.
    if (!result[r.applicationId]) result[r.applicationId] = r.createdAt;
  }
  return result;
}

/** Verifica que el job exista y pertenezca a la org. */
export async function getJobForPipeline(
  jobId: string,
  organizationId: string,
): Promise<{ id: string; title: string; status: string } | null> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({ id: jobs.id, title: jobs.title, status: jobs.status })
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.organizationId, organizationId)))
      .limit(1),
    "db.applications.job-for-pipeline",
  );
  return rows[0] ?? null;
}
