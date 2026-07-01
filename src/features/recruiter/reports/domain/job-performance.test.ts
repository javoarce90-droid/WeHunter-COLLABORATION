import { describe, it, expect } from "vitest";
import { computeJobPerformance, type EventRow } from "./job-performance";

const NOW = new Date("2026-06-20T00:00:00Z");
const day = (n: number) => new Date(NOW.getTime() - n * 86_400_000);

describe("computeJobPerformance", () => {
  it("arma el funnel en orden canónico con ceros donde no hay datos", () => {
    const r = computeJobPerformance({
      stageCounts: [
        { stage: "new", count: 3 },
        { stage: "hired", count: 1 },
      ],
      sourceCounts: [],
      events: [],
      now: NOW,
    });

    expect(r.funnel[0]).toEqual({ stage: "new", count: 3 });
    expect(r.funnel.find((f) => f.stage === "screening")).toEqual({
      stage: "screening",
      count: 0,
    });
    expect(r.funnel.find((f) => f.stage === "hired")).toEqual({ stage: "hired", count: 1 });
    expect(r.totalApplications).toBe(4);
  });

  it("ordena el source breakdown por cantidad desc y mapea null a unknown", () => {
    const r = computeJobPerformance({
      stageCounts: [],
      sourceCounts: [
        { source: "linkedin", count: 2 },
        { source: null, count: 5 },
        { source: "referral", count: 3 },
      ],
      events: [],
      now: NOW,
    });

    expect(r.sourceBreakdown).toEqual([
      { source: "unknown", count: 5 },
      { source: "referral", count: 3 },
      { source: "linkedin", count: 2 },
    ]);
  });

  it("calcula tiempo promedio en etapa desde los eventos", () => {
    // Una postulación: creada (new) hace 10d, pasó a screening hace 6d, sigue ahí.
    const events: EventRow[] = [
      { applicationId: "a1", fromStage: null, toStage: "new", createdAt: day(10) },
      { applicationId: "a1", fromStage: "new", toStage: "screening", createdAt: day(6) },
    ];
    const r = computeJobPerformance({ stageCounts: [], sourceCounts: [], events, now: NOW });

    // new: de día -10 a día -6 = 4 días. screening: de día -6 a ahora = 6 días.
    expect(r.avgTimeInStage).toContainEqual({ stage: "new", days: 4 });
    expect(r.avgTimeInStage).toContainEqual({ stage: "screening", days: 6 });
    expect(r.trackedCount).toBe(1);
  });

  it("promedia el tiempo en etapa entre varias postulaciones", () => {
    const events: EventRow[] = [
      // a1: 2 días en new
      { applicationId: "a1", fromStage: null, toStage: "new", createdAt: day(10) },
      { applicationId: "a1", fromStage: "new", toStage: "screening", createdAt: day(8) },
      // a2: 4 días en new
      { applicationId: "a2", fromStage: null, toStage: "new", createdAt: day(10) },
      { applicationId: "a2", fromStage: "new", toStage: "screening", createdAt: day(6) },
    ];
    const r = computeJobPerformance({ stageCounts: [], sourceCounts: [], events, now: NOW });
    // promedio en new = (2 + 4) / 2 = 3
    expect(r.avgTimeInStage).toContainEqual({ stage: "new", days: 3 });
  });

  it("calcula time-to-hire promedio solo sobre los contratados", () => {
    const events: EventRow[] = [
      // a1: contratado 8 días después de postularse
      { applicationId: "a1", fromStage: null, toStage: "new", createdAt: day(10) },
      { applicationId: "a1", fromStage: "new", toStage: "hired", createdAt: day(2) },
      // a2: nunca contratado, no cuenta
      { applicationId: "a2", fromStage: null, toStage: "new", createdAt: day(5) },
    ];
    const r = computeJobPerformance({ stageCounts: [], sourceCounts: [], events, now: NOW });
    expect(r.timeToHireDays).toBe(8);
  });

  it("time-to-hire es null si nadie fue contratado", () => {
    const r = computeJobPerformance({
      stageCounts: [{ stage: "new", count: 2 }],
      sourceCounts: [],
      events: [
        { applicationId: "a1", fromStage: null, toStage: "new", createdAt: day(3) },
      ],
      now: NOW,
    });
    expect(r.timeToHireDays).toBeNull();
  });

  it("sin eventos no hay métricas de tiempo (postulaciones históricas)", () => {
    const r = computeJobPerformance({
      stageCounts: [{ stage: "interview", count: 4 }],
      sourceCounts: [{ source: "manual", count: 4 }],
      events: [],
      now: NOW,
    });
    expect(r.avgTimeInStage).toEqual([]);
    expect(r.timeToHireDays).toBeNull();
    expect(r.trackedCount).toBe(0);
    // pero el funnel y el total sí están completos
    expect(r.totalApplications).toBe(4);
  });
});
