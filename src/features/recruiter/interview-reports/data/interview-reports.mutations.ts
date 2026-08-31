import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { interviewReports } from "@/db/schema";
import {
  parseInterviewReportContent,
  type InterviewReportContent,
  type InterviewReportRow,
  type Recommendation,
} from "../schema";

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
    recommendation: r.recommendation as Recommendation,
    recommendationJustification: r.recommendationJustification,
    generatedBy: r.generatedBy,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/** Crea o reemplaza el informe de una entrevista (regenerar sobre uno existente lo pisa —
 *  sin versionado en v1). */
export async function upsertInterviewReport(row: {
  organizationId: string;
  interviewId: string;
  content: InterviewReportContent;
  recommendation: Recommendation;
  recommendationJustification: string;
  sourceNotes: string;
  generatedBy: string | null;
}): Promise<InterviewReportRow> {
  const db = await getDb();
  return db.rls(async (tx) => {
    const [saved] = await tx
      .insert(interviewReports)
      .values({
        organizationId: row.organizationId,
        interviewId: row.interviewId,
        content: row.content,
        recommendation: row.recommendation,
        recommendationJustification: row.recommendationJustification,
        sourceNotes: row.sourceNotes,
        generatedBy: row.generatedBy,
      })
      .onConflictDoUpdate({
        target: interviewReports.interviewId,
        set: {
          content: row.content,
          recommendation: row.recommendation,
          recommendationJustification: row.recommendationJustification,
          sourceNotes: row.sourceNotes,
          generatedBy: row.generatedBy,
          updatedAt: new Date(),
        },
      })
      .returning();
    return toRow(saved);
  }, "db.interview-reports.upsert");
}

/** Persiste la edición del recruiter sobre un informe ya generado (contenido + recomendación),
 *  sin tocar `sourceNotes` (se conserva lo que generó el informe original). */
export async function updateInterviewReport(
  interviewId: string,
  patch: InterviewReportContent & { recommendation: Recommendation; recommendationJustification: string },
): Promise<InterviewReportRow> {
  const db = await getDb();
  return db.rls(async (tx) => {
    const { recommendation, recommendationJustification, ...content } = patch;
    const [saved] = await tx
      .update(interviewReports)
      .set({
        content,
        recommendation,
        recommendationJustification,
        updatedAt: new Date(),
      })
      .where(eq(interviewReports.interviewId, interviewId))
      .returning();
    return toRow(saved);
  }, "db.interview-reports.update");
}
