import type { ApplicationStage } from "../../applications/schema";
import { legacyStageFor } from "@/features/recruiter/applications/domain/mover-a-etapa";
import type { JobStageSlaRow } from "./job-stage-sla";

/**
 * Nombre a mostrar para cada balde canónico, tomado de las etapas reales de la búsqueda
 * (`job_stages`, editables desde el Kanban) en vez del label genérico del enum. Misma regla
 * de bucketing que `bucketJobStageSla` / `moveToStage` (`legacyStageFor`).
 *
 * Cuando varias etapas custom colapsan al mismo balde (ej. "Screening" + "Entrevista" → el
 * balde `screening` de las métricas), se muestran las dos unidas por " · " en orden de
 * pipeline: la fila del reporte representa el tiempo/volumen combinado de todas ellas, así que
 * el nombre también. Un balde sin ninguna etapa propia no aparece — la UI cae al label del enum.
 */
export function bucketJobStageLabels(
  stages: JobStageSlaRow[],
): Partial<Record<ApplicationStage, string>> {
  const byBucket = new Map<ApplicationStage, { name: string; position: number }[]>();

  for (const stage of stages) {
    const bucket = legacyStageFor(stage);
    const name = stage.name.trim();
    if (!name) continue;
    const list = byBucket.get(bucket) ?? [];
    list.push({ name, position: stage.position });
    byBucket.set(bucket, list);
  }

  const result: Partial<Record<ApplicationStage, string>> = {};
  for (const [bucket, names] of byBucket) {
    result[bucket] = names
      .sort((a, b) => a.position - b.position)
      .map((n) => n.name)
      .join(" · ");
  }
  return result;
}
