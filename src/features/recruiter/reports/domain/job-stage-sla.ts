import type { ApplicationStage } from "../../applications/schema";
import type { JobStage } from "@/features/recruiter/pipeline-stages/schema";
import { legacyStageFor } from "@/features/recruiter/applications/domain/mover-a-etapa";

export type JobStageSlaRow = JobStage & { legacyStage: ApplicationStage | null };

/**
 * Bucketea las etapas custom de una búsqueda al enum canónico con la MISMA regla
 * (`legacyStageFor`) que ya usa `moveToStage` para escribir `applications.stage`. Cuando
 * varias etapas custom caen en el mismo balde, gana el SLA más estricto (mínimo, ignorando
 * null); si todas las del balde son null, el balde queda null.
 */
export function bucketJobStageSla(
  stages: JobStageSlaRow[],
): Partial<Record<ApplicationStage, number | null>> {
  const byBucket = new Map<ApplicationStage, number[]>();
  const bucketsSeen = new Set<ApplicationStage>();

  for (const stage of stages) {
    const bucket = legacyStageFor(stage);
    bucketsSeen.add(bucket);
    if (stage.slaDays != null) {
      const list = byBucket.get(bucket) ?? [];
      list.push(stage.slaDays);
      byBucket.set(bucket, list);
    }
  }

  const result: Partial<Record<ApplicationStage, number | null>> = {};
  for (const bucket of bucketsSeen) {
    const values = byBucket.get(bucket);
    result[bucket] = values && values.length > 0 ? Math.min(...values) : null;
  }
  return result;
}
