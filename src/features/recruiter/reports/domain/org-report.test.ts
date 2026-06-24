import { describe, it, expect } from "vitest";
import { computeOrgReport } from "./org-report";
import type { OrgReportRaw } from "../data/reports.queries";

const base: OrgReportRaw = {
  jobsByStatus: [],
  candidatesCount: 0,
  stageCounts: [],
  sourceCounts: [],
  trends: [],
  hireTimings: [],
  jobsByRecruiter: [],
  hiresByRecruiter: [],
};

describe("computeOrgReport", () => {
  it("calcula KPIs y conversión", () => {
    const r = computeOrgReport({
      ...base,
      jobsByStatus: [
        { status: "open", count: 3 },
        { status: "closed", count: 2 },
      ],
      candidatesCount: 40,
      stageCounts: [
        { stage: "new", count: 8 },
        { stage: "hired", count: 2 },
      ],
    });
    expect(r.kpis.totalJobs).toBe(5);
    expect(r.kpis.openJobs).toBe(3);
    expect(r.kpis.totalCandidates).toBe(40);
    expect(r.kpis.totalApplications).toBe(10);
    expect(r.kpis.hires).toBe(2);
    expect(r.kpis.conversionPct).toBe(20);
  });

  it("conversión 0 sin postulaciones", () => {
    const r = computeOrgReport(base);
    expect(r.kpis.conversionPct).toBe(0);
    expect(r.timeToHireDays).toBeNull();
  });

  it("promedia el time-to-hire de las contrataciones", () => {
    const day = (n: number) => new Date(2026, 0, n);
    const r = computeOrgReport({
      ...base,
      hireTimings: [
        { appCreated: day(1), hiredAt: day(11) }, // 10 días
        { appCreated: day(1), hiredAt: day(5) }, // 4 días
      ],
    });
    expect(r.timeToHireDays).toBe(7);
  });

  it("arma performance por recruiter ordenado por contrataciones", () => {
    const r = computeOrgReport({
      ...base,
      jobsByRecruiter: [
        { ownerId: "u1", name: "Ana", count: 3 },
        { ownerId: "u2", name: "Beto", count: 5 },
        { ownerId: null, name: null, count: 1 },
      ],
      hiresByRecruiter: [
        { ownerId: "u1", count: 4 },
        { ownerId: "u2", count: 1 },
      ],
    });
    expect(r.perRecruiter[0]).toEqual({ name: "Ana", jobs: 3, hires: 4 });
    expect(r.perRecruiter[1]).toEqual({ name: "Beto", jobs: 5, hires: 1 });
    expect(r.perRecruiter[2]).toEqual({ name: "Sin asignar", jobs: 1, hires: 0 });
  });
});
