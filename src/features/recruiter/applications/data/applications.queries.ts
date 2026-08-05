import {
  and,
  eq,
  ne,
  or,
  asc,
  desc,
  sql,
  isNull,
  isNotNull,
  inArray,
} from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  applications,
  applicationEvents,
  candidates,
  jobs,
  jobStages,
  profiles,
  candidateWorkExperiences,
  candidateEducation,
  type Job,
} from "@/db/schema";
import type {
  CandidateExperienceInput,
  CandidateEducationInput,
} from "@/lib/ai";
import type { ApplicationStage, RejectionReason } from "../schema";
import type { InboxApplicationRow } from "../domain/pasar-al-pipeline";
import type { StageKind } from "../../pipeline-stages/schema";

/** Lecturas del pipeline. Cliente RLS; filtramos siempre por organization activa. */

export type ApplicationWithCandidate = {
  id: string;
  organizationId: string;
  jobId: string;
  candidateId: string;
  stage: ApplicationStage;
  /** Etapa propia de la búsqueda (job_stages). null = todavía no migrada. */
  stageId: string | null;
  stageKind: StageKind | null;
  /** Cuándo entró a la etapa actual — resetea en cada movimiento. */
  stageEnteredAt: Date;
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

/**
 * Postulaciones del tablero: SOLO las que el recruiter decidió avanzar
 * (`pipeline_entered_at` no nulo). Lo que sigue en la bandeja de Postulados todavía no es
 * parte del proceso — para eso está `listPostulados`, que trae todo lo recibido.
 */
export async function listApplicationsByJob(
  jobId: string,
  organizationId: string,
): Promise<ApplicationWithCandidate[]> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          id: applications.id,
          organizationId: applications.organizationId,
          jobId: applications.jobId,
          candidateId: applications.candidateId,
          stage: applications.stage,
          stageId: applications.stageId,
          stageKind: jobStages.kind,
          stageEnteredAt: applications.stageEnteredAt,
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
        .leftJoin(jobStages, eq(applications.stageId, jobStages.id))
        .where(
          and(
            eq(applications.jobId, jobId),
            eq(applications.organizationId, organizationId),
            isNotNull(applications.pipelineEnteredAt),
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
    stageId: r.stageId,
    stageKind: r.stageKind as StageKind | null,
    stageEnteredAt: r.stageEnteredAt,
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

/**
 * Candidatos que YA están en la búsqueda, en cualquier estado (bandeja, pipeline o
 * descartados). El selector de "Agregar candidatos" los excluye del pool: no alcanza con
 * mirar el pipeline, porque quien está en la bandeja también tiene su postulación y el
 * índice único la rechazaría.
 */
export async function listCandidateIdsByJob(
  jobId: string,
  organizationId: string,
): Promise<string[]> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({ candidateId: applications.candidateId })
        .from(applications)
        .where(
          and(
            eq(applications.jobId, jobId),
            eq(applications.organizationId, organizationId),
          ),
        ),
    "db.applications.candidate-ids-by-job",
  );
  return rows.map((r) => r.candidateId);
}

export async function getApplicationById(
  applicationId: string,
  organizationId: string,
): Promise<InboxApplicationRow | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
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
    pipelineEnteredAt: r.pipelineEnteredAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

export type ApplicationForMove = {
  id: string;
  organizationId: string;
  jobId: string;
  candidateId: string;
  stage: ApplicationStage;
  createdAt: Date;
  updatedAt: Date;
  candidateProfileId: string | null;
  jobTitle: string;
};

/** Trae la postulación + lo mínimo de candidato/puesto para decidir si hay que notificar al
 * candidato al moverla. Reemplaza a getApplicationById en moverEtapaAction: mismo shape base,
 * en una sola consulta en vez de dos (esta + la que moverEtapa haría por su cuenta). */
export async function getApplicationForMove(
  applicationId: string,
  organizationId: string,
): Promise<ApplicationForMove | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          id: applications.id,
          organizationId: applications.organizationId,
          jobId: applications.jobId,
          candidateId: applications.candidateId,
          stage: applications.stage,
          createdAt: applications.createdAt,
          updatedAt: applications.updatedAt,
          candidateProfileId: candidates.profileId,
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
    "db.applications.for-move",
  );
  const r = rows[0];
  if (!r) return null;
  return { ...r, stage: r.stage as ApplicationStage };
}

export type ApplicationForStageMove = {
  id: string;
  jobId: string;
  stageId: string | null;
  /** Kind de la etapa donde está hoy; null si todavía no fue migrada a `job_stages`. */
  stageKind: StageKind | null;
  stage: ApplicationStage;
  candidateProfileId: string | null;
  jobTitle: string;
};

/** Trae la postulación + su etapa por-búsqueda actual, para `moverAEtapaAction`
 *  (`mover-a-etapa.ts`, tablero nuevo por job_stages). Análogo a `getApplicationForMove`
 *  pero por `stage_id` en vez del enum legacy. */
export async function getApplicationForStageMove(
  applicationId: string,
  organizationId: string,
): Promise<ApplicationForStageMove | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          id: applications.id,
          jobId: applications.jobId,
          stageId: applications.stageId,
          stageKind: jobStages.kind,
          stage: applications.stage,
          candidateProfileId: candidates.profileId,
          jobTitle: jobs.title,
        })
        .from(applications)
        .innerJoin(candidates, eq(applications.candidateId, candidates.id))
        .innerJoin(jobs, eq(applications.jobId, jobs.id))
        .leftJoin(jobStages, eq(applications.stageId, jobStages.id))
        .where(
          and(
            eq(applications.id, applicationId),
            eq(applications.organizationId, organizationId),
          ),
        )
        .limit(1),
    "db.applications.for-stage-move",
  );
  const r = rows[0];
  if (!r) return null;
  return {
    ...r,
    stageKind: r.stageKind as StageKind | null,
    stage: r.stage as ApplicationStage,
  };
}

export async function findExistingApplication(
  jobId: string,
  candidateId: string,
): Promise<{ id: string } | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
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
  const rows = await db.rls(
    (tx) =>
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
  /** null = pendiente de decisión (sigue en la bandeja). */
  pipelineEnteredAt: Date | null;
  /** true = auto-postulación (Career Site/portal). false = alta manual desde el pool
   *  (sourcer o recruiter). Es de ESTA postulación, no del candidato (ver comentario en el
   *  schema, columna `applications.self_applied`). */
  selfApplied: boolean;
  aiScore: number | null;
  aiSummary: string | null;
  /** Señales de atención calculadas junto al score (ej. "sin CV"). [] = sin analizar o sin señales. */
  aiRedFlags: string[];
  /** Desglose del match por categoría (0–100 cada una). null = sin analizar todavía. */
  aiBreakdown: {
    experiencia: number;
    skillsTecnicos: number;
    seniority: number;
    idiomas: number;
    ubicacion: number;
  } | null;
  /** Puntos fuertes del candidato calculados junto al score. */
  aiStrengths: string[];
  /** Mensaje que el propio candidato escribió al postularse. */
  coverNote: string | null;
  /** Pretensión salarial declarada al postularse. Opcional, no siempre está. */
  expectedSalary: number | null;
  expectedSalaryCurrency: string | null;
  createdAt: Date;
  /** A cuántas búsquedas de esta organización se postuló este candidato (incluida esta). */
  applicationCount: number;
  candidate: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    cvUrl: string | null;
    source: string | null;
    /** Puesto y última empresa, ej. "Frontend Senior @ Acme". */
    headline: string | null;
    /** Si ya es parte del pool de talento del recruiter (no es un estado de esta
     *  postulación — ver candidates.saved_to_pool). Decide si se ofrece "Guardar en
     *  Talent Pool" o si ya es redundante. */
    savedToPool: boolean;
    location: string | null;
    skills: string[] | null;
    linkedinUrl: string | null;
  };
};

/**
 * Postulados pendientes de decisión (bandeja) de una búsqueda, para la tabla de triage. Una
 * vez que el responsable decide (pasa al pipeline o rechaza) deja de aparecer acá para
 * siempre — filtrado en el propio query, no en el cliente (database.md #4). Trae fuente (que
 * el pipeline no necesita) más `applicationCount` con una subquery correlacionada (sin query
 * aparte por candidato — database.md #6). Una query con join; ordena por fecha. Con límite.
 */
export async function listPostulados(
  jobId: string,
  organizationId: string,
): Promise<PostuladoRow[]> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          id: applications.id,
          stage: applications.stage,
          pipelineEnteredAt: applications.pipelineEnteredAt,
          selfApplied: applications.selfApplied,
          aiScore: applications.aiScore,
          aiSummary: applications.aiSummary,
          aiRedFlags: applications.aiRedFlags,
          aiBreakdown: applications.aiBreakdown,
          aiStrengths: applications.aiStrengths,
          coverNote: applications.coverNote,
          expectedSalary: applications.expectedSalary,
          expectedSalaryCurrency: applications.expectedSalaryCurrency,
          createdAt: applications.createdAt,
          candidateId: candidates.id,
          candidateFullName: candidates.fullName,
          candidateEmail: candidates.email,
          candidatePhone: candidates.phone,
          candidateCvUrl: candidates.cvUrl,
          candidateSource: candidates.source,
          candidateHeadline: candidates.headline,
          candidateSavedToPool: candidates.savedToPool,
          candidateLocation: candidates.location,
          candidateSkills: candidates.skills,
          candidateLinkedinUrl: candidates.linkedinUrl,
          // Subquery correlacionada (no ventana): la partición del `where jobId=X` de esta
          // query siempre da 1 por candidato, no sirve para "a cuántas búsquedas se postuló".
          // Sigue siendo UNA sola consulta a la base (database.md #3), no un round-trip extra.
          applicationCount: sql<number>`(
          select count(*)::int from ${applications} a2
          where a2.candidate_id = ${candidates.id} and a2.organization_id = ${organizationId}
        )`,
        })
        .from(applications)
        .innerJoin(candidates, eq(applications.candidateId, candidates.id))
        .where(
          and(
            eq(applications.jobId, jobId),
            eq(applications.organizationId, organizationId),
            isNull(applications.pipelineEnteredAt),
            ne(applications.stage, "rejected"),
          ),
        )
        .orderBy(desc(applications.createdAt))
        .limit(200),
    "db.applications.postulados",
  );
  return rows.map((r) => ({
    id: r.id,
    stage: r.stage as ApplicationStage,
    pipelineEnteredAt: r.pipelineEnteredAt,
    selfApplied: r.selfApplied,
    aiScore: r.aiScore,
    aiSummary: r.aiSummary,
    aiRedFlags: r.aiRedFlags ?? [],
    aiBreakdown: r.aiBreakdown,
    aiStrengths: r.aiStrengths ?? [],
    coverNote: r.coverNote,
    expectedSalary: r.expectedSalary,
    expectedSalaryCurrency: r.expectedSalaryCurrency,
    createdAt: r.createdAt,
    applicationCount: Number(r.applicationCount),
    candidate: {
      id: r.candidateId,
      fullName: r.candidateFullName,
      email: r.candidateEmail,
      phone: r.candidatePhone,
      cvUrl: r.candidateCvUrl,
      source: r.candidateSource,
      savedToPool: r.candidateSavedToPool,
      headline: r.candidateHeadline,
      location: r.candidateLocation,
      skills: r.candidateSkills,
      linkedinUrl: r.candidateLinkedinUrl,
    },
  }));
}

/**
 * Candidatos detrás de un conjunto de postulaciones, en UNA query. Lo usa el contacto en
 * lote: sin esto haría dos consultas por fila (postulación y candidato) solo para armar el
 * saludo. Ver database.md #3 y #6.
 */
export async function listCandidatesForApplications(
  applicationIds: string[],
  organizationId: string,
): Promise<{ applicationId: string; id: string; fullName: string }[]> {
  if (applicationIds.length === 0) return [];
  const db = await getDb();
  return db.rls(
    (tx) =>
      tx
        .select({
          applicationId: applications.id,
          id: candidates.id,
          fullName: candidates.fullName,
        })
        .from(applications)
        .innerJoin(candidates, eq(applications.candidateId, candidates.id))
        .where(
          and(
            inArray(applications.id, applicationIds),
            eq(applications.organizationId, organizationId),
          ),
        ),
    "db.applications.candidates-for-applications",
  );
}

/** Datos de los candidatos de un job para puntuar con IA (skills, perfil, experiencia,
 *  educación). El match nunca mira si hay CV cargado — eso no es una señal de compatibilidad. */
export type ScoringRow = {
  id: string;
  candidate: {
    id: string;
    skills: string[] | null;
    summary: string | null;
    source: string | null;
    experience: CandidateExperienceInput[];
    education: CandidateEducationInput[];
  };
};

export async function listApplicationsForScoring(
  jobId: string,
  organizationId: string,
): Promise<ScoringRow[]> {
  const db = await getDb();
  // Para candidatos vinculados (profileId), profiles es la fuente de verdad de bio/skills/CV
  // para el scoring — candidates.summary/skills/cvUrl NO se tocan (esas mismas columnas las
  // muestra la ficha del recruiter, que deliberadamente no se fusiona con el perfil real). El
  // join acá es solo para leer, nunca para escribir.
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          id: applications.id,
          candidateId: candidates.id,
          profileId: candidates.profileId,
          skills: candidates.skills,
          summary: candidates.summary,
          source: candidates.source,
          profileBio: profiles.bio,
          profileSkills: profiles.skills,
        })
        .from(applications)
        .innerJoin(candidates, eq(applications.candidateId, candidates.id))
        .leftJoin(profiles, eq(candidates.profileId, profiles.id))
        .where(
          and(
            eq(applications.jobId, jobId),
            eq(applications.organizationId, organizationId),
          ),
        )
        .limit(200),
    "db.applications.for-scoring",
  );
  if (rows.length === 0) return [];

  // Experiencia/educación en 2 queries acotadas para TODO el lote (no una por candidato): cada
  // fila pertenece a un candidateId (carga manual) O a un profileId (candidato vinculado), nunca
  // a los dos (constraint de la tabla) — por eso el `or` cubre ambos casos en una sola pasada.
  const candidateIds = rows.map((r) => r.candidateId);
  const profileIds = rows
    .map((r) => r.profileId)
    .filter((id): id is string => id != null);
  const [experiences, educations] = await Promise.all([
    db.rls(
      (tx) =>
        tx
          .select({
            candidateId: candidateWorkExperiences.candidateId,
            profileId: candidateWorkExperiences.profileId,
            company: candidateWorkExperiences.company,
            position: candidateWorkExperiences.position,
            description: candidateWorkExperiences.description,
          })
          .from(candidateWorkExperiences)
          .where(
            or(
              inArray(candidateWorkExperiences.candidateId, candidateIds),
              profileIds.length > 0
                ? inArray(candidateWorkExperiences.profileId, profileIds)
                : undefined,
            ),
          ),
      "db.applications.for-scoring.experience",
    ),
    db.rls(
      (tx) =>
        tx
          .select({
            candidateId: candidateEducation.candidateId,
            profileId: candidateEducation.profileId,
            degree: candidateEducation.degree,
            institution: candidateEducation.institution,
            fieldOfStudy: candidateEducation.fieldOfStudy,
          })
          .from(candidateEducation)
          .where(
            or(
              inArray(candidateEducation.candidateId, candidateIds),
              profileIds.length > 0
                ? inArray(candidateEducation.profileId, profileIds)
                : undefined,
            ),
          ),
      "db.applications.for-scoring.education",
    ),
  ]);

  const expByKey = new Map<string, CandidateExperienceInput[]>();
  for (const e of experiences) {
    const key = e.profileId ? `p:${e.profileId}` : `c:${e.candidateId}`;
    const list = expByKey.get(key) ?? [];
    list.push({
      position: e.position,
      company: e.company,
      description: e.description,
    });
    expByKey.set(key, list);
  }
  const eduByKey = new Map<string, CandidateEducationInput[]>();
  for (const e of educations) {
    const key = e.profileId ? `p:${e.profileId}` : `c:${e.candidateId}`;
    const list = eduByKey.get(key) ?? [];
    list.push({
      degree: e.degree,
      institution: e.institution,
      fieldOfStudy: e.fieldOfStudy,
    });
    eduByKey.set(key, list);
  }

  return rows.map((r) => {
    const key = r.profileId ? `p:${r.profileId}` : `c:${r.candidateId}`;
    return {
      id: r.id,
      candidate: {
        id: r.candidateId,
        skills: r.skills?.length ? r.skills : r.profileSkills,
        summary: r.summary ?? r.profileBio,
        source: r.source,
        experience: expByKey.get(key) ?? [],
        education: eduByKey.get(key) ?? [],
      },
    };
  });
}

export type StageCount = {
  stageId: string;
  name: string;
  kind: StageKind;
  count: number;
};

export type JobApplicationCounts = {
  /** Etapas REALES de esta búsqueda (sin la bandeja), en orden de tablero — cada una con
   *  cuántos candidatos ya entraron al pipeline y están ahí. Reemplaza el desglose por enum
   *  fijo: con etapas propias por job, dos etapas custom podían compartir el mismo
   *  `legacyStage` y quedar mezcladas en un solo bucket. */
  stages: StageCount[];
  /** Postulaciones recibidas, estén donde estén. */
  recibidas: number;
  /** En la bandeja esperando decisión (ni avanzadas ni descartadas). */
  pendientes: number;
};

/** Foto de las postulaciones de una búsqueda. Una query agrupada (database.md #3): el
 *  desglose por etapa y los totales de la bandeja salen del mismo escaneo. */
export async function getJobStageCounts(
  jobId: string,
  organizationId: string,
): Promise<JobApplicationCounts> {
  const db = await getDb();
  const [stageRows, totalsRow] = await db.rls(async (tx) => {
    // LEFT JOIN para que una etapa sin candidatos siga apareciendo (con 0), igual que antes.
    const stageRows = await tx
      .select({
        stageId: jobStages.id,
        name: jobStages.name,
        kind: jobStages.kind,
        count: sql<number>`count(${applications.id}) filter (where ${isNotNull(applications.pipelineEnteredAt)})::int`,
      })
      .from(jobStages)
      .leftJoin(
        applications,
        and(
          eq(applications.stageId, jobStages.id),
          eq(applications.organizationId, organizationId),
        ),
      )
      .where(and(eq(jobStages.jobId, jobId), ne(jobStages.kind, "inbox")))
      .groupBy(jobStages.id, jobStages.name, jobStages.kind, jobStages.position)
      .orderBy(asc(jobStages.position));

    const [totalsRow] = await tx
      .select({
        recibidas: sql<number>`count(*)::int`,
        pendientes: sql<number>`count(*) filter (where ${applications.pipelineEnteredAt} is null and ${applications.stage} != 'rejected')::int`,
      })
      .from(applications)
      .where(
        and(
          eq(applications.jobId, jobId),
          eq(applications.organizationId, organizationId),
        ),
      );

    return [stageRows, totalsRow] as const;
  }, "db.applications.stage-counts");

  return {
    stages: stageRows.map((r) => ({
      stageId: r.stageId,
      name: r.name,
      kind: r.kind as StageKind,
      count: r.count,
    })),
    recibidas: totalsRow?.recibidas ?? 0,
    pendientes: totalsRow?.pendientes ?? 0,
  };
}

/** Cuántos candidatos (de cualquier búsqueda de la org) están hoy en una etapa puntual.
 *  Usado para bloquear la desactivación de una etapa que todavía tiene gente adentro. */
export async function countApplicationsInStage(
  organizationId: string,
  stage: ApplicationStage,
): Promise<number> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({ n: sql<number>`count(*)::int` })
        .from(applications)
        .where(
          and(
            eq(applications.organizationId, organizationId),
            eq(applications.stage, stage),
          ),
        ),
    "db.applications.count-in-stage",
  );
  return rows[0]?.n ?? 0;
}

/** Evento de historial de una postulación, para la timeline en el sheet de detalle.
 *  rejectionReason/rejectionNote solo vienen presentes en eventos de rechazo, y son
 *  privados del recruiter (no hay portal de candidato que los exponga). */
export type StageHistoryEvent = {
  id: string;
  applicationId: string;
  fromStage: ApplicationStage | null;
  toStage: ApplicationStage;
  createdAt: Date;
  changedByName: string | null;
  rejectionReason: RejectionReason | null;
  rejectionNote: string | null;
};

/**
 * Historial de cambios de etapa de todas las postulaciones de un job (para el pipeline).
 * Una query con join: application_events → applications (del job) + left join al profile
 * que hizo el cambio. Sin N+1 (mismo patrón que listNotesByJob).
 */
export async function listStageEventsByJob(
  jobId: string,
  organizationId: string,
): Promise<StageHistoryEvent[]> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          id: applicationEvents.id,
          applicationId: applicationEvents.applicationId,
          fromStage: applicationEvents.fromStage,
          toStage: applicationEvents.toStage,
          createdAt: applicationEvents.createdAt,
          changedByName: profiles.fullName,
          changedByEmail: profiles.email,
          rejectionReason: applicationEvents.rejectionReason,
          rejectionNote: applicationEvents.rejectionNote,
        })
        .from(applicationEvents)
        .innerJoin(
          applications,
          eq(applicationEvents.applicationId, applications.id),
        )
        .leftJoin(profiles, eq(applicationEvents.changedBy, profiles.id))
        .where(
          and(
            eq(applications.jobId, jobId),
            eq(applicationEvents.organizationId, organizationId),
          ),
        )
        .orderBy(desc(applicationEvents.createdAt))
        .limit(500),
    "db.applications.stage-events-by-job",
  );
  return rows.map((r) => ({
    id: r.id,
    applicationId: r.applicationId,
    fromStage: r.fromStage as ApplicationStage | null,
    toStage: r.toStage as ApplicationStage,
    createdAt: r.createdAt,
    changedByName: r.changedByName ?? r.changedByEmail ?? null,
    rejectionReason: r.rejectionReason as RejectionReason | null,
    rejectionNote: r.rejectionNote,
  }));
}

/**
 * Historial de cambios de etapa de TODAS las postulaciones (pasadas y presentes) de un
 * candidato, para el tab Historial de su ficha. Mismo join que listStageEventsByJob pero
 * filtrando por candidate_id (cubierto por applications_candidate_idx) en vez de job_id.
 */
export async function listStageEventsByCandidate(
  candidateId: string,
  organizationId: string,
): Promise<StageHistoryEvent[]> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          id: applicationEvents.id,
          applicationId: applicationEvents.applicationId,
          fromStage: applicationEvents.fromStage,
          toStage: applicationEvents.toStage,
          createdAt: applicationEvents.createdAt,
          changedByName: profiles.fullName,
          changedByEmail: profiles.email,
          rejectionReason: applicationEvents.rejectionReason,
          rejectionNote: applicationEvents.rejectionNote,
        })
        .from(applicationEvents)
        .innerJoin(
          applications,
          eq(applicationEvents.applicationId, applications.id),
        )
        .leftJoin(profiles, eq(applicationEvents.changedBy, profiles.id))
        .where(
          and(
            eq(applications.candidateId, candidateId),
            eq(applicationEvents.organizationId, organizationId),
          ),
        )
        .orderBy(desc(applicationEvents.createdAt))
        .limit(500),
    "db.applications.stage-events-by-candidate",
  );
  return rows.map((r) => ({
    id: r.id,
    applicationId: r.applicationId,
    fromStage: r.fromStage as ApplicationStage | null,
    toStage: r.toStage as ApplicationStage,
    createdAt: r.createdAt,
    changedByName: r.changedByName ?? r.changedByEmail ?? null,
    rejectionReason: r.rejectionReason as RejectionReason | null,
    rejectionNote: r.rejectionNote,
  }));
}

/** Verifica que el job exista y pertenezca a la org. */
export async function getJobForPipeline(
  jobId: string,
  organizationId: string,
): Promise<{ id: string; title: string; status: string } | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({ id: jobs.id, title: jobs.title, status: jobs.status })
        .from(jobs)
        .where(and(eq(jobs.id, jobId), eq(jobs.organizationId, organizationId)))
        .limit(1),
    "db.applications.job-for-pipeline",
  );
  return rows[0] ?? null;
}
