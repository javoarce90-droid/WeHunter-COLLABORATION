import { APPLICATION_STAGES, type ApplicationStage } from "../../applications/schema";

/**
 * Cálculo de la performance de una búsqueda a partir de filas crudas (lo trae la capa data).
 * Función pura y testeable: recibe `now` por parámetro para no depender del reloj.
 *
 * - funnel/total/source salen del estado ACTUAL (completo, incluso postulaciones viejas).
 * - las métricas de tiempo salen de application_events (solo postulaciones con historial
 *   registrado; las creadas antes de que registráramos eventos quedan fuera, a propósito).
 */

export type StageCountRow = { stage: string; count: number };
export type SourceCountRow = { source: string | null; count: number };
export type EventRow = {
  applicationId: string;
  fromStage: string | null;
  toStage: string;
  createdAt: Date;
};

export type JobReportInput = {
  stageCounts: StageCountRow[];
  sourceCounts: SourceCountRow[];
  events: EventRow[];
  now: Date;
};

export type JobPerformance = {
  funnel: { stage: ApplicationStage; count: number }[];
  totalApplications: number;
  /** source = clave del enum, o "unknown" si el candidato no tiene fuente cargada. */
  sourceBreakdown: { source: string; count: number }[];
  /** Días promedio desde la postulación hasta la contratación. null si nadie fue contratado. */
  timeToHireDays: number | null;
  /** Días promedio que las postulaciones pasaron en cada etapa. */
  avgTimeInStage: { stage: ApplicationStage; days: number }[];
  /** Cuántas postulaciones tienen historial (base de las métricas de tiempo). */
  trackedCount: number;
};

const MS_PER_DAY = 86_400_000;
const round1 = (n: number) => Math.round(n * 10) / 10;

export function computeJobPerformance(input: JobReportInput): JobPerformance {
  const { stageCounts, sourceCounts, events, now } = input;

  // Funnel: una fila por etapa canónica, en orden, con su count (0 si no aparece).
  const stageMap = new Map(stageCounts.map((r) => [r.stage, r.count]));
  const funnel = APPLICATION_STAGES.map((stage) => ({
    stage,
    count: stageMap.get(stage) ?? 0,
  }));
  const totalApplications = stageCounts.reduce((sum, r) => sum + r.count, 0);

  // Source breakdown ordenado por cantidad desc.
  const sourceBreakdown = sourceCounts
    .map((r) => ({ source: r.source ?? "unknown", count: r.count }))
    .sort((a, b) => b.count - a.count);

  // Métricas de tiempo desde los eventos, agrupados por postulación.
  const byApplication = new Map<string, EventRow[]>();
  for (const ev of events) {
    const list = byApplication.get(ev.applicationId);
    if (list) list.push(ev);
    else byApplication.set(ev.applicationId, [ev]);
  }

  const stageDurationTotals = new Map<string, { sum: number; n: number }>();
  const hireDurations: number[] = [];

  for (const evs of byApplication.values()) {
    const sorted = [...evs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Tiempo en cada etapa: desde que entró hasta el siguiente evento (o ahora, si es la actual).
    for (let i = 0; i < sorted.length; i++) {
      const stage = sorted[i].toStage;
      const enteredAt = sorted[i].createdAt.getTime();
      const exitedAt = i + 1 < sorted.length ? sorted[i + 1].createdAt.getTime() : now.getTime();
      const duration = Math.max(0, exitedAt - enteredAt);
      const acc = stageDurationTotals.get(stage) ?? { sum: 0, n: 0 };
      acc.sum += duration;
      acc.n += 1;
      stageDurationTotals.set(stage, acc);
    }

    // Time-to-hire: desde el primer evento (creación) hasta el evento de contratación.
    const firstAt = sorted[0]?.createdAt.getTime();
    const hiredEvent = sorted.find((e) => e.toStage === "hired");
    if (firstAt != null && hiredEvent) {
      hireDurations.push(hiredEvent.createdAt.getTime() - firstAt);
    }
  }

  const avgTimeInStage = APPLICATION_STAGES.map((stage) => {
    const acc = stageDurationTotals.get(stage);
    return { stage, days: acc && acc.n > 0 ? round1(acc.sum / acc.n / MS_PER_DAY) : 0 };
  }).filter((s) => s.days > 0);

  const timeToHireDays =
    hireDurations.length > 0
      ? round1(hireDurations.reduce((a, b) => a + b, 0) / hireDurations.length / MS_PER_DAY)
      : null;

  return {
    funnel,
    totalApplications,
    sourceBreakdown,
    timeToHireDays,
    avgTimeInStage,
    trackedCount: byApplication.size,
  };
}
