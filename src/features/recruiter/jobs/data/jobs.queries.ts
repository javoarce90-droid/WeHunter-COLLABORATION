import { cache } from "react";
import { and, eq, or, desc, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getDb } from "@/db/client";
import { jobs, applications, organizations, memberships, profiles, type Job } from "@/db/schema";

/** Búsquedas donde el membership es responsable o sourcer — condición compartida por los
 *  listados que aceptan `scopeToMembershipId` (roles acotados por asignación, ver
 *  `isAssignmentScoped` en `@/lib/auth/roles`). */
function assignedToMembership(membershipId: string) {
  return or(eq(jobs.assignedTo, membershipId), eq(jobs.sourcerId, membershipId));
}

/** Lecturas de búsquedas. Cliente RLS; además filtramos por organizationId activa. */

// Cap defensivo: ningún listado sin limit (database.md regla #4). La paginación real
// (cursor + UI) queda como follow-up; por ahora cubrimos cargas razonables.
const LIST_LIMIT = 100;

/** Columnas livianas para listados. NO traemos benefits ni los Markdown (database.md regla #4). */
export type JobListItem = Pick<
  Job,
  "id" | "title" | "status" | "createdAt" | "updatedAt"
>;

export async function listJobs(
  organizationId: string,
  scopeToMembershipId?: string,
): Promise<JobListItem[]> {
  const db = await getDb();
  return db.rls(
    (tx) =>
      tx
        .select({
          id: jobs.id,
          title: jobs.title,
          status: jobs.status,
          createdAt: jobs.createdAt,
          updatedAt: jobs.updatedAt,
        })
        .from(jobs)
        .where(
          and(
            eq(jobs.organizationId, organizationId),
            scopeToMembershipId ? assignedToMembership(scopeToMembershipId) : undefined,
          ),
        )
        .orderBy(desc(jobs.createdAt))
        .limit(LIST_LIMIT),
    "db.jobs.list",
  );
}

/** Búsqueda (columnas de listado) + su actividad: visitas al aviso y estado de las postulaciones. */
export type JobWithStats = JobListItem & {
  /** Postulaciones recibidas, estén donde estén. */
  receivedCount: number;
  /** En la bandeja de Postulados, sin decisión tomada. */
  pendingCount: number;
  /** Visitas al aviso en el Career Site público. */
  viewCount: number;
  priority: Job["priority"];
  /** Veces que se copió el link público del aviso. */
  shareCount: number;
  /** Responsable único de la búsqueda (nombre para mostrar en el listado). */
  assigneeName: string | null;
};

/**
 * Listado para la pantalla de búsquedas: cada job con el conteo de su pipeline.
 * Una sola query (LEFT JOIN + GROUP BY), no N+1 (database.md reglas #3 y #6). El conteo
 * usa los índices `jobs_org_idx` y `applications_job_idx`. RLS aísla por org en ambas tablas.
 * Selecciona solo columnas livianas: los campos pesados (benefits, Markdown) van en el detalle.
 */
export async function listJobsWithStats(
  organizationId: string,
  scopeToMembershipId?: string,
): Promise<JobWithStats[]> {
  const db = await getDb();
  return db.rls(
    (tx) =>
      tx
        .select({
          id: jobs.id,
          title: jobs.title,
          status: jobs.status,
          createdAt: jobs.createdAt,
          updatedAt: jobs.updatedAt,
          viewCount: jobs.viewCount,
          priority: jobs.priority,
          shareCount: jobs.shareCount,
          assigneeName: profiles.fullName,
          receivedCount: sql<number>`count(${applications.id})::int`,
          pendingCount: sql<number>`count(${applications.id}) filter (
            where ${applications.pipelineEnteredAt} is null
              and ${applications.stage} <> 'rejected'
          )::int`,
        })
        .from(jobs)
        .leftJoin(applications, eq(applications.jobId, jobs.id))
        .innerJoin(memberships, eq(memberships.id, jobs.assignedTo))
        .innerJoin(profiles, eq(profiles.id, memberships.profileId))
        .where(
          and(
            eq(jobs.organizationId, organizationId),
            scopeToMembershipId ? assignedToMembership(scopeToMembershipId) : undefined,
          ),
        )
        .groupBy(jobs.id, profiles.fullName)
        .orderBy(desc(jobs.createdAt))
        .limit(LIST_LIMIT),
    "db.jobs.list-with-stats",
  );
}

export type RecentOpenJob = {
  id: string;
  title: string;
  status: Job["status"];
  viewCount: number;
  receivedCount: number;
  pendingCount: number;
};

/** Últimas búsquedas abiertas, para el widget "Tus búsquedas activas" del dashboard —
 *  versión liviana de listJobsWithStats, acotada a `open` y a un puñado de filas. */
export async function listRecentOpenJobs(
  organizationId: string,
  limitN = 3,
  scopeToMembershipId?: string,
): Promise<RecentOpenJob[]> {
  const db = await getDb();
  return db.rls(
    (tx) =>
      tx
        .select({
          id: jobs.id,
          title: jobs.title,
          status: jobs.status,
          viewCount: jobs.viewCount,
          receivedCount: sql<number>`count(${applications.id})::int`,
          pendingCount: sql<number>`count(${applications.id}) filter (
            where ${applications.pipelineEnteredAt} is null
              and ${applications.stage} <> 'rejected'
          )::int`,
        })
        .from(jobs)
        .leftJoin(applications, eq(applications.jobId, jobs.id))
        .where(
          and(
            eq(jobs.organizationId, organizationId),
            eq(jobs.status, "open"),
            scopeToMembershipId ? assignedToMembership(scopeToMembershipId) : undefined,
          ),
        )
        .groupBy(jobs.id)
        .orderBy(desc(jobs.updatedAt))
        .limit(limitN),
    "db.jobs.recent-open",
  );
}

/**
 * Una búsqueda por id. Cacheada por request (`cache()` de React): el layout del workspace y
 * la pestaña Detalle la piden ambos en un mismo render y comparten una única transacción RLS.
 */
export const getJobById = cache(async function getJobById(
  jobId: string,
  organizationId: string,
): Promise<Job | null> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.organizationId, organizationId)))
      .limit(1),
    "db.jobs.get",
  );
  return rows[0] ?? null;
});

export type JobAssignee = { membershipId: string; name: string | null; email: string };
export type JobAssignees = { responsible: JobAssignee; sourcer: JobAssignee | null };

/** Responsable (siempre) + sourcer (opcional) de una búsqueda, para el header del detalle.
 *  Una sola query con dos joins a memberships/profiles (aliased, no N+1). */
export async function getJobAssignees(
  jobId: string,
  organizationId: string,
): Promise<JobAssignees | null> {
  const db = await getDb();
  const respMembership = alias(memberships, "resp_membership");
  const respProfile = alias(profiles, "resp_profile");
  const sourcerMembership = alias(memberships, "sourcer_membership");
  const sourcerProfile = alias(profiles, "sourcer_profile");

  const rows = await db.rls(
    (tx) =>
      tx
        .select({
          responsibleMembershipId: respMembership.id,
          responsibleName: respProfile.fullName,
          responsibleEmail: respProfile.email,
          sourcerMembershipId: sourcerMembership.id,
          sourcerName: sourcerProfile.fullName,
          sourcerEmail: sourcerProfile.email,
        })
        .from(jobs)
        .innerJoin(respMembership, eq(respMembership.id, jobs.assignedTo))
        .innerJoin(respProfile, eq(respProfile.id, respMembership.profileId))
        .leftJoin(sourcerMembership, eq(sourcerMembership.id, jobs.sourcerId))
        .leftJoin(sourcerProfile, eq(sourcerProfile.id, sourcerMembership.profileId))
        .where(and(eq(jobs.id, jobId), eq(jobs.organizationId, organizationId)))
        .limit(1),
    "db.jobs.assignees",
  );

  const row = rows[0];
  if (!row) return null;
  return {
    responsible: {
      membershipId: row.responsibleMembershipId,
      name: row.responsibleName,
      email: row.responsibleEmail,
    },
    sourcer: row.sourcerMembershipId
      ? { membershipId: row.sourcerMembershipId, name: row.sourcerName, email: row.sourcerEmail! }
      : null,
  };
}

export async function getJobStatus(
  jobId: string,
  organizationId: string,
): Promise<Job["status"] | null> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({ status: jobs.status })
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.organizationId, organizationId)))
      .limit(1),
    "db.jobs.get-status",
  );
  return rows[0]?.status ?? null;
}

/** Slug de la organización activa, para armar el link público de una búsqueda (/careers/[slug]/[jobId]). */
export const getOrganizationSlug = cache(async function getOrganizationSlug(
  organizationId: string,
): Promise<string | null> {
  const db = await getDb();
  const rows = await db.rls(
    (tx) =>
      tx
        .select({ slug: organizations.slug })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1),
    "db.jobs.organization-slug",
  );
  return rows[0]?.slug ?? null;
});
