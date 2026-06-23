import { ok, err, type Result } from "@/lib/result";
import type { Application } from "@/db/schema";

/**
 * Caso de uso: calcular los KPIs del dashboard del reclutador para su organization.
 * Solo lectura. Las cuentas crudas las trae la capa data; acá viven las reglas de qué
 * significa cada KPI (p. ej. "postulaciones activas" excluye las cerradas).
 *
 * NOTA: "entrevistas próximas" queda fuera hasta que exista la tabla interviews (Slice 5).
 */

type Stage = Application["stage"];

/** Etapas terminales: una postulación en estas ya no está "activa" en el pipeline. */
const CLOSED_STAGES: Stage[] = ["hired", "rejected"];

export interface DashboardKpis {
  busquedasAbiertas: number;
  busquedasTotales: number;
  candidatosEnPool: number;
  postulacionesActivas: number;
  contrataciones: number;
}

export interface ObtenerKpisCtx {
  organizationId: string | null;
}

/** Cuentas crudas del workspace, tal como las trae la capa data en una sola lectura. */
export interface DashboardCounts {
  jobs: { total: number; open: number };
  candidates: number;
  byStage: Partial<Record<Stage, number>>;
}

export interface ObtenerKpisDeps {
  getCounts(organizationId: string): Promise<DashboardCounts>;
}

export async function obtenerKpis(
  ctx: ObtenerKpisCtx,
  deps: ObtenerKpisDeps,
): Promise<Result<DashboardKpis>> {
  if (!ctx.organizationId) {
    return err("No hay un workspace activo.");
  }

  const {
    jobs,
    candidates: candidatosEnPool,
    byStage,
  } = await deps.getCounts(ctx.organizationId);

  const totalPostulaciones = Object.values(byStage).reduce(
    (acc, n) => acc + (n ?? 0),
    0,
  );
  const cerradas = CLOSED_STAGES.reduce(
    (acc, stage) => acc + (byStage[stage] ?? 0),
    0,
  );

  return ok({
    busquedasAbiertas: jobs.open,
    busquedasTotales: jobs.total,
    candidatosEnPool,
    postulacionesActivas: totalPostulaciones - cerradas,
    contrataciones: byStage.hired ?? 0,
  });
}
