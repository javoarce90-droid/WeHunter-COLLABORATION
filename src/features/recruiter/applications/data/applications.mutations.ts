import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { applications } from "@/db/schema";
import type { ApplicationStage } from "../schema";
import type { ApplicationRow } from "../domain/postular-candidato";

/** Escrituras del pipeline. Cliente RLS; el organizationId acota a la org activa. */

export async function insertApplication(args: {
  organizationId: string;
  jobId: string;
  candidateId: string;
  stage: ApplicationStage;
}): Promise<ApplicationRow> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .insert(applications)
      .values({
        organizationId: args.organizationId,
        jobId: args.jobId,
        candidateId: args.candidateId,
        stage: args.stage,
      })
      .returning(),
  );
  const r = rows[0]!;
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

export async function updateApplicationStage(
  applicationId: string,
  stage: ApplicationStage,
): Promise<ApplicationRow> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .update(applications)
      .set({ stage, updatedAt: new Date() })
      .where(eq(applications.id, applicationId))
      .returning(),
  );
  const r = rows[0]!;
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

export async function deleteApplication(
  applicationId: string,
  organizationId: string,
): Promise<{ deleted: boolean }> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .delete(applications)
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.organizationId, organizationId),
        ),
      )
      .returning({ id: applications.id }),
  );
  return { deleted: rows.length > 0 };
}
