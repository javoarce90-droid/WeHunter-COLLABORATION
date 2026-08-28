import { can } from "@/lib/auth/roles";
import type { OrgRole } from "@/lib/auth/session";

export type PendingReportInterview = {
  id: string;
  applicationId: string;
  jobId: string;
  scheduledAt: Date;
  candidateName: string;
  jobTitle: string;
};

export type ListarPendientesDeps = {
  listPendingReports: (organizationId: string, now: Date, limit: number) => Promise<PendingReportInterview[]>;
};

const LIMIT = 5;

/** Entrevistas que ya pasaron y todavía no tienen informe generado — para el widget de
 *  Inicio. Mismo criterio de "pasó y no está cancelada" que habilita el botón
 *  (`puedeGenerarInforme`), no depende del estado. Mismo criterio de visibilidad que
 *  "Próximas entrevistas" (gate por `interviews.manage`, org-wide, sin scoping por
 *  asignación — ver `getDashboardAgendaSummary`). */
export async function listarEntrevistasPendientesInforme(
  ctx: { organizationId: string; role: OrgRole; now: Date },
  deps: ListarPendientesDeps,
): Promise<PendingReportInterview[]> {
  if (!can(ctx.role, "interviews.manage")) return [];
  return deps.listPendingReports(ctx.organizationId, ctx.now, LIMIT);
}
