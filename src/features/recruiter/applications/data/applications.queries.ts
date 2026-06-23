import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { applications, candidates, jobs } from "@/db/schema";
import type { ApplicationStage } from "../schema";

/** Lecturas del pipeline. Cliente RLS; filtramos siempre por organization activa. */

export type ApplicationWithCandidate = {
  id: string;
  organizationId: string;
  jobId: string;
  candidateId: string;
  stage: ApplicationStage;
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
  );
  return rows.map((r) => ({
    id: r.id,
    organizationId: r.organizationId,
    jobId: r.jobId,
    candidateId: r.candidateId,
    stage: r.stage as ApplicationStage,
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
  );
  return rows[0] ?? null;
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
  );
  return rows[0] ?? null;
}
