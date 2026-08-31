import { describe, it, expect, vi } from "vitest";
import { generarInformeEntrevista, puedeGenerarInforme, type GenerarInformeDeps } from "./generar-informe-entrevista";
import { parseInterviewReportContent, type InterviewReportRow } from "../schema";
import type { InterviewReportResult } from "@/lib/ai";

const now = new Date("2026-08-28T12:00:00Z");
const ctx = { organizationId: "org-1", role: "recruiter" as const, userId: "user-1", now };

const aiResult: InterviewReportResult = {
  ...parseInterviewReportContent({ resumenPerfil: "Resumen." }),
  recommendation: "continuar_evaluando",
  recommendationJustification: "Justificación.",
};

const savedRow: InterviewReportRow = {
  interviewId: "iv-1",
  ...parseInterviewReportContent({ resumenPerfil: "Resumen." }),
  recommendation: "continuar_evaluando",
  recommendationJustification: "Justificación.",
  generatedBy: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeDeps(overrides: Partial<GenerarInformeDeps> = {}): GenerarInformeDeps {
  return {
    getInterviewContext: vi.fn().mockResolvedValue({
      candidateName: "Ana Pérez",
      jobTitle: "Frontend Senior",
      jobId: "job-1",
      interviewerName: "Juan Recruiter",
      interviewDate: new Date("2026-08-20T15:00:00Z"),
      status: "scheduled",
    }),
    generateReport: vi.fn().mockResolvedValue(aiResult),
    markInterviewCompleted: vi.fn().mockResolvedValue(undefined),
    upsertReport: vi.fn().mockResolvedValue(savedRow),
    ...overrides,
  };
}

describe("puedeGenerarInforme", () => {
  it("true si ya pasó y no está cancelada, sin importar el estado", () => {
    expect(puedeGenerarInforme({ scheduledAt: new Date("2026-08-20T00:00:00Z"), status: "scheduled" }, now)).toBe(true);
    expect(puedeGenerarInforme({ scheduledAt: new Date("2026-08-20T00:00:00Z"), status: "completed" }, now)).toBe(true);
  });
  it("false si todavía no pasó", () => {
    expect(puedeGenerarInforme({ scheduledAt: new Date("2026-09-01T00:00:00Z"), status: "scheduled" }, now)).toBe(false);
  });
  it("false si está cancelada, aunque ya haya pasado", () => {
    expect(puedeGenerarInforme({ scheduledAt: new Date("2026-08-20T00:00:00Z"), status: "cancelled" }, now)).toBe(false);
  });
});

describe("generarInformeEntrevista", () => {
  it("rechaza roles sin ai.use", async () => {
    const deps = makeDeps();
    const res = await generarInformeEntrevista(
      { interviewId: "iv-1", sourceText: "Notas de la entrevista, bastante largas." },
      { ...ctx, role: "viewer" },
      deps,
    );
    expect(res.ok).toBe(false);
    expect(deps.getInterviewContext).not.toHaveBeenCalled();
  });

  it("rechaza si la entrevista no existe", async () => {
    const deps = makeDeps({ getInterviewContext: vi.fn().mockResolvedValue(null) });
    const res = await generarInformeEntrevista(
      { interviewId: "iv-1", sourceText: "Notas de la entrevista, bastante largas." },
      ctx,
      deps,
    );
    expect(res).toEqual({ ok: false, error: "Entrevista no encontrada." });
  });

  it("rechaza una entrevista cancelada aunque ya haya pasado", async () => {
    const deps = makeDeps({
      getInterviewContext: vi.fn().mockResolvedValue({
        candidateName: "Ana Pérez",
        jobTitle: "Frontend Senior",
        interviewerName: "Juan Recruiter",
        interviewDate: new Date("2026-08-20T15:00:00Z"),
        status: "cancelled",
      }),
    });
    const res = await generarInformeEntrevista(
      { interviewId: "iv-1", sourceText: "Notas de la entrevista, bastante largas." },
      ctx,
      deps,
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/cancelada/);
    expect(deps.generateReport).not.toHaveBeenCalled();
  });

  it("rechaza una entrevista que todavía no se realizó, aunque esté marcada completed", async () => {
    const deps = makeDeps({
      getInterviewContext: vi.fn().mockResolvedValue({
        candidateName: "Ana Pérez",
        jobTitle: "Frontend Senior",
        interviewerName: "Juan Recruiter",
        interviewDate: new Date("2026-09-01T15:00:00Z"),
        status: "completed",
      }),
    });
    const res = await generarInformeEntrevista(
      { interviewId: "iv-1", sourceText: "Notas de la entrevista, bastante largas." },
      ctx,
      deps,
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/no se realizó/);
    expect(deps.generateReport).not.toHaveBeenCalled();
  });

  it("genera, persiste el informe y marca la entrevista completed sin exigir que ya lo estuviera", async () => {
    const deps = makeDeps();
    const res = await generarInformeEntrevista(
      { interviewId: "iv-1", sourceText: "Notas de la entrevista, bastante largas." },
      ctx,
      deps,
    );
    expect(res).toEqual({ ok: true, data: { report: savedRow, jobId: "job-1" } });
    expect(deps.generateReport).toHaveBeenCalledWith(
      expect.objectContaining({ candidateName: "Ana Pérez", jobTitle: "Frontend Senior" }),
    );
    expect(deps.upsertReport).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-1", interviewId: "iv-1", generatedBy: "user-1" }),
    );
    expect(deps.markInterviewCompleted).toHaveBeenCalledWith("iv-1");
  });

  it("no vuelve a marcar completed si ya lo estaba", async () => {
    const deps = makeDeps({
      getInterviewContext: vi.fn().mockResolvedValue({
        candidateName: "Ana Pérez",
        jobTitle: "Frontend Senior",
        interviewerName: "Juan Recruiter",
        interviewDate: new Date("2026-08-20T15:00:00Z"),
        status: "completed",
      }),
    });
    await generarInformeEntrevista(
      { interviewId: "iv-1", sourceText: "Notas de la entrevista, bastante largas." },
      ctx,
      deps,
    );
    expect(deps.markInterviewCompleted).not.toHaveBeenCalled();
  });
});
