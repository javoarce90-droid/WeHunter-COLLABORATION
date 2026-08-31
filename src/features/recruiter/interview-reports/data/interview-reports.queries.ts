import { and, desc, eq, isNull, lte, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { interviewReports, interviews, applications, candidates, jobs, profiles } from "@/db/schema";
import {
  parseInterviewReportContent,
  type InterviewReportRow,
} from "../schema";
import type { InterviewContextForReport } from "../domain/generar-informe-entrevista";
import type { PendingReportInterview } from "../domain/listar-entrevistas-pendientes-informe";

function toRow(r: {
  interviewId: string;
  content: unknown;
  recommendation: string;
  recommendationJustification: string;
  generatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}): InterviewReportRow {
  return {
    interviewId: r.interviewId,
    ...parseInterviewReportContent(r.content),
    recommendation: r.recommendation as InterviewReportRow["recommendation"],
    recommendationJustification: r.recommendationJustification,
    generatedBy: r.generatedBy,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/** Informe ya generado de una entrevista, si existe. */
export async function getReportByInterviewId(
  interviewId: string,
  organizationId: string,
): Promise<InterviewReportRow | null> {
  const db = await getDb();
  return db.rls(async (tx) => {
    const rows = await tx
      .select()
      .from(interviewReports)
      .where(
        and(
          eq(interviewReports.interviewId, interviewId),
          eq(interviewReports.organizationId, organizationId),
        ),
      )
      .limit(1);
    return rows[0] ? toRow(rows[0]) : null;
  }, "db.interview-reports.get-by-interview");
}

export type ApplicationInterviewReport = {
  content: ReturnType<typeof parseInterviewReportContent>;
  recommendation: InterviewReportRow["recommendation"];
  recommendationJustification: string;
  interviewDate: Date;
};

/** El informe de entrevista más reciente de una postulación (para la shortlist compartida y su
 *  vista interna). `null` si no se generó ninguno. */
export async function getInterviewReportForApplication(
  applicationId: string,
  organizationId: string,
): Promise<ApplicationInterviewReport | null> {
  const db = await getDb();
  return db.rls(async (tx) => {
    const rows = await tx
      .select({
        content: interviewReports.content,
        recommendation: interviewReports.recommendation,
        recommendationJustification: interviewReports.recommendationJustification,
        interviewDate: interviews.scheduledAt,
      })
      .from(interviewReports)
      .innerJoin(interviews, eq(interviewReports.interviewId, interviews.id))
      .where(
        and(
          eq(interviews.applicationId, applicationId),
          eq(interviewReports.organizationId, organizationId),
        ),
      )
      .orderBy(desc(interviews.scheduledAt))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      content: parseInterviewReportContent(r.content),
      recommendation: r.recommendation as InterviewReportRow["recommendation"],
      recommendationJustification: r.recommendationJustification,
      interviewDate: r.interviewDate,
    };
  }, "db.interview-reports.for-application");
}

export type CandidateInterviewReport = {
  interviewId: string;
  jobId: string;
  jobTitle: string;
  interviewDate: Date;
  interviewerName: string;
  report: InterviewReportRow;
};

/** Todos los informes de entrevista de un candidato (a través de sus postulaciones), para la
 *  ficha del candidato — más reciente primero. Cada informe queda atado a su búsqueda. */
export async function listInterviewReportsForCandidate(
  candidateId: string,
  organizationId: string,
): Promise<CandidateInterviewReport[]> {
  const db = await getDb();
  return db.rls(async (tx) => {
    const rows = await tx
      .select({
        interviewId: interviewReports.interviewId,
        content: interviewReports.content,
        recommendation: interviewReports.recommendation,
        recommendationJustification: interviewReports.recommendationJustification,
        generatedBy: interviewReports.generatedBy,
        createdAt: interviewReports.createdAt,
        updatedAt: interviewReports.updatedAt,
        jobId: jobs.id,
        jobTitle: jobs.title,
        interviewDate: interviews.scheduledAt,
        interviewerName: profiles.fullName,
        interviewerEmail: profiles.email,
      })
      .from(interviewReports)
      .innerJoin(interviews, eq(interviewReports.interviewId, interviews.id))
      .innerJoin(applications, eq(interviews.applicationId, applications.id))
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .leftJoin(profiles, eq(interviews.createdBy, profiles.id))
      .where(
        and(
          eq(applications.candidateId, candidateId),
          eq(interviewReports.organizationId, organizationId),
        ),
      )
      .orderBy(desc(interviews.scheduledAt));

    return rows.map((r) => ({
      interviewId: r.interviewId,
      jobId: r.jobId,
      jobTitle: r.jobTitle,
      interviewDate: r.interviewDate,
      interviewerName: r.interviewerName ?? r.interviewerEmail ?? "Recruiter",
      report: {
        interviewId: r.interviewId,
        ...parseInterviewReportContent(r.content),
        recommendation: r.recommendation as InterviewReportRow["recommendation"],
        recommendationJustification: r.recommendationJustification,
        generatedBy: r.generatedBy,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      },
    }));
  }, "db.interview-reports.list-for-candidate");
}

/** Datos de la entrevista + candidato/puesto/entrevistador para armar el prompt de IA y las
 *  secciones "Fuente: WeHunter" del informe. */
export async function getInterviewContextForReport(
  interviewId: string,
  organizationId: string,
): Promise<InterviewContextForReport | null> {
  const db = await getDb();
  return db.rls(async (tx) => {
    const rows = await tx
      .select({
        candidateName: candidates.fullName,
        jobTitle: jobs.title,
        jobId: jobs.id,
        interviewerName: profiles.fullName,
        interviewerEmail: profiles.email,
        interviewDate: interviews.scheduledAt,
        status: interviews.status,
      })
      .from(interviews)
      .innerJoin(applications, eq(interviews.applicationId, applications.id))
      .innerJoin(candidates, eq(applications.candidateId, candidates.id))
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .leftJoin(profiles, eq(interviews.createdBy, profiles.id))
      .where(and(eq(interviews.id, interviewId), eq(interviews.organizationId, organizationId)))
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return {
      candidateName: row.candidateName,
      jobTitle: row.jobTitle,
      jobId: row.jobId,
      interviewerName: row.interviewerName ?? row.interviewerEmail ?? "Recruiter",
      interviewDate: row.interviewDate,
      status: row.status,
    };
  }, "db.interview-reports.get-interview-context");
}

/** Entrevistas que ya pasaron (y no fueron canceladas) sin informe generado — mismo criterio
 *  que `puedeGenerarInforme` en el dominio, no depende de que alguien haya tocado el estado a
 *  mano. Org-wide (ver domain para el gate de rol). */
export async function listPendingReports(
  organizationId: string,
  now: Date,
  limit: number,
): Promise<PendingReportInterview[]> {
  const db = await getDb();
  return db.rls(async (tx) => {
    const rows = await tx
      .select({
        id: interviews.id,
        applicationId: interviews.applicationId,
        jobId: jobs.id,
        scheduledAt: interviews.scheduledAt,
        candidateName: candidates.fullName,
        jobTitle: jobs.title,
      })
      .from(interviews)
      .innerJoin(applications, eq(interviews.applicationId, applications.id))
      .innerJoin(candidates, eq(applications.candidateId, candidates.id))
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .leftJoin(interviewReports, eq(interviewReports.interviewId, interviews.id))
      .where(
        and(
          eq(interviews.organizationId, organizationId),
          lte(interviews.scheduledAt, now),
          ne(interviews.status, "cancelled"),
          isNull(interviewReports.id),
        ),
      )
      .orderBy(desc(interviews.scheduledAt))
      .limit(limit);
    return rows;
  }, "db.interview-reports.list-pending");
}
