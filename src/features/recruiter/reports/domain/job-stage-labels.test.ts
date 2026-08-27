import { describe, it, expect } from "vitest";
import { bucketJobStageLabels } from "./job-stage-labels";
import type { JobStageSlaRow } from "./job-stage-sla";

let idSeq = 0;
function mkStage(overrides: Partial<JobStageSlaRow>): JobStageSlaRow {
  idSeq += 1;
  return {
    id: `stage-${idSeq}`,
    name: `Etapa ${idSeq}`,
    position: idSeq,
    kind: "in_process",
    legacyStage: null,
    slaDays: null,
    ...overrides,
  };
}

describe("bucketJobStageLabels", () => {
  it("usa el nombre real de la etapa de la búsqueda para su balde", () => {
    const r = bucketJobStageLabels([
      mkStage({ kind: "inbox", name: "Mis Candidatos", position: 0 }),
      mkStage({ kind: "in_process", legacyStage: "screening", name: "Preselección", position: 1 }),
      mkStage({ kind: "offer", name: "Propuesta", position: 5 }),
    ]);
    expect(r.new).toBe("Mis Candidatos");
    expect(r.screening).toBe("Preselección");
    expect(r.offer).toBe("Propuesta");
  });

  it("une con ' · ' las etapas custom que colapsan al mismo balde, en orden de pipeline", () => {
    const r = bucketJobStageLabels([
      mkStage({ name: "Entrevista Técnica", position: 3 }),
      mkStage({ name: "Screening", position: 1 }),
      mkStage({ name: "Entrevista RH", position: 2 }),
    ]);
    expect(r.screening).toBe("Screening · Entrevista RH · Entrevista Técnica");
  });

  it("un balde sin etapas propias no aparece (la UI cae al label del enum)", () => {
    const r = bucketJobStageLabels([mkStage({ kind: "inbox", name: "Bandeja", position: 0 })]);
    expect(r.new).toBe("Bandeja");
    expect(r.screening).toBeUndefined();
    expect(r.offer).toBeUndefined();
  });

  it("ignora nombres vacíos", () => {
    const r = bucketJobStageLabels([mkStage({ kind: "offer", name: "   " })]);
    expect(r.offer).toBeUndefined();
  });

  it("sin etapas devuelve objeto vacío", () => {
    expect(bucketJobStageLabels([])).toEqual({});
  });
});
