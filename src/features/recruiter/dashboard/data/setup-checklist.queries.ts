import { and, count, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { jobs, candidates, organizations } from "@/db/schema";
import type { WorkspaceType } from "@/lib/auth/session";
import type { SetupCounts } from "../domain/calcular-progreso-setup";
import { getOrganization } from "@/features/recruiter/settings/data/settings.queries";
import { countStageTemplates } from "@/features/recruiter/pipeline-stages/data/job-stage-templates.queries";
import { countClients } from "@/features/recruiter/clients/data/clients.queries";
import { countMembersAndPendingInvitations } from "@/features/recruiter/team/data/team.queries";

/**
 * Cuentas para el checklist de setup (Inicio + widget flotante). Reusa las funciones ya
 * existentes de cada feature (career site, etapas, equipo/clientes) en paralelo, y suma una
 * transacción propia solo para lo que no tenía un count liviano todavía (búsquedas/candidatos).
 */
export async function getSetupChecklistCounts(
  organizationId: string,
  workspaceType: WorkspaceType | null,
): Promise<SetupCounts> {
  const db = await getDb();

  const [org, stageTemplatesCount, teamOrClientsCount, jobsAndCandidates] = await Promise.all([
    getOrganization(organizationId),
    countStageTemplates(organizationId),
    workspaceType === "freelance"
      ? countClients(organizationId)
      : countMembersAndPendingInvitations(organizationId),
    db.rls(async (tx) => {
      const [jobRows, candidateRows] = await Promise.all([
        tx.select({ n: count() }).from(jobs).where(eq(jobs.organizationId, organizationId)),
        tx
          .select({ n: count() })
          .from(candidates)
          .where(eq(candidates.organizationId, organizationId)),
      ]);
      return { jobsCount: jobRows[0]?.n ?? 0, candidatesCount: candidateRows[0]?.n ?? 0 };
    }, "db.setup-checklist.counts"),
  ]);

  return {
    careerSiteConfigured: !!org?.branding?.description || !!org?.careerSiteCoverUrl,
    stageTemplatesCount,
    teamOrClientsCount,
    jobsCount: jobsAndCandidates.jobsCount,
    candidatesCount: jobsAndCandidates.candidatesCount,
  };
}

/**
 * Marca el setup como completo, una única vez. UPDATE idempotente (no INSERT): a diferencia
 * del bug de semillas duplicadas por prefetch concurrente (ver [[settings-screen-port-2026-08]]),
 * dos requests concurrentes acá solo hacen no-op la segunda vez gracias al `isNull` en el WHERE.
 * Seguro de disparar desde un render (Server Component), no requiere pasar por una action.
 */
export async function markSetupChecklistCompletedIfDone(organizationId: string): Promise<void> {
  const db = await getDb();
  await db.rls(
    (tx) =>
      tx
        .update(organizations)
        .set({ setupChecklistCompletedAt: new Date() })
        .where(
          and(eq(organizations.id, organizationId), isNull(organizations.setupChecklistCompletedAt)),
        ),
    "db.setup-checklist.mark-completed",
  );
}
