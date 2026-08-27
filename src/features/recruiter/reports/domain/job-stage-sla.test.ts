import { describe, it, expect } from "vitest";
import { bucketJobStageSla, type JobStageSlaRow } from "./job-stage-sla";

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

describe("bucketJobStageSla", () => {
  it("toma el SLA mínimo entre varias etapas in_process que colapsan al mismo balde", () => {
    const r = bucketJobStageSla([
      mkStage({ name: "Entrevista RH", slaDays: 5 }),
      mkStage({ name: "Entrevista Técnica", slaDays: 2 }),
      mkStage({ name: "Entrevista Cliente", slaDays: 7 }),
    ]);
    expect(r.screening).toBe(2);
  });

  it("ignora los SLA null del mínimo si hay al menos uno con valor", () => {
    const r = bucketJobStageSla([mkStage({ slaDays: null }), mkStage({ slaDays: 4 })]);
    expect(r.screening).toBe(4);
  });

  it("si TODAS las etapas del balde tienen SLA null, el balde queda null", () => {
    const r = bucketJobStageSla([mkStage({ slaDays: null }), mkStage({ slaDays: null })]);
    expect(r.screening).toBeNull();
  });

  it("mapea inbox/offer/hired/rejected directo por kind", () => {
    const r = bucketJobStageSla([
      mkStage({ kind: "inbox", slaDays: 1 }),
      mkStage({ kind: "offer", slaDays: 10 }),
      mkStage({ kind: "hired", slaDays: null }),
      mkStage({ kind: "rejected", slaDays: 3 }),
    ]);
    expect(r.new).toBe(1);
    expect(r.offer).toBe(10);
    expect(r.hired).toBeNull();
    expect(r.rejected).toBe(3);
  });

  it("respeta legacyStage explícito por sobre el kind (etapa sembrada del molde)", () => {
    const r = bucketJobStageSla([
      mkStage({ kind: "in_process", legacyStage: "interview_tech", slaDays: 3 }),
    ]);
    expect(r.interview_tech).toBe(3);
    expect(r.screening).toBeUndefined();
  });

  it("sin etapas devuelve objeto vacío", () => {
    expect(bucketJobStageSla([])).toEqual({});
  });
});
