import { and, eq, asc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { applications, notes, profiles } from "@/db/schema";

/** Lectura de nota para el dominio: retorna id + notes de la application si pertenece a la org. */

export type TimelineNote = {
  id: string;
  applicationId: string;
  body: string;
  createdAt: Date;
  authorName: string | null;
};

/**
 * Notas del timeline de todas las postulaciones de un job (para el pipeline). Una query con
 * join: notes → applications (del job) + left join al profile autor. Sin N+1.
 */
export async function listNotesByJob(
  jobId: string,
  organizationId: string,
): Promise<TimelineNote[]> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({
        id: notes.id,
        applicationId: notes.applicationId,
        body: notes.body,
        createdAt: notes.createdAt,
        authorName: profiles.fullName,
        authorEmail: profiles.email,
      })
      .from(notes)
      .innerJoin(applications, eq(notes.applicationId, applications.id))
      .leftJoin(profiles, eq(notes.createdBy, profiles.id))
      .where(
        and(
          eq(applications.jobId, jobId),
          eq(notes.organizationId, organizationId),
        ),
      )
      .orderBy(asc(notes.createdAt))
      .limit(500),
    "db.notes.by-job",
  );
  return rows.map((r) => ({
    id: r.id,
    applicationId: r.applicationId,
    body: r.body,
    createdAt: r.createdAt,
    authorName: r.authorName ?? r.authorEmail ?? null,
  }));
}

export async function getApplicationForNote(
  applicationId: string,
  organizationId: string,
): Promise<{ id: string; notes: string | null } | null> {
  const db = await getDb();
  const rows = await db.rls((tx) =>
    tx
      .select({ id: applications.id, notes: applications.notes })
      .from(applications)
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.organizationId, organizationId),
        ),
      )
      .limit(1),
    "db.notes.get-application",
  );
  return rows[0] ?? null;
}
