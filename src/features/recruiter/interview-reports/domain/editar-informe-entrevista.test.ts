import { describe, it, expect, vi } from "vitest";
import { editarInformeEntrevista, type EditarInformeDeps } from "./editar-informe-entrevista";
import { parseInterviewReportContent, type InterviewReportRow } from "../schema";

const ctx = { organizationId: "org-1", role: "recruiter" as const };

const input = {
  interviewId: "iv-1",
  ...parseInterviewReportContent({
    ubicacion: "CABA",
    remuneracionPretendida: "USD 2000",
    disponibilidadIngreso: "Inmediata",
    resumenPerfil: "Resumen editado.",
    fortalezas: ["Buena comunicación"],
    aspectosAValidar: ["Nivel de inglés"],
  }),
  recommendation: "avanzar" as const,
  recommendationJustification: "Justificación editada.",
};

const savedRow: InterviewReportRow = {
  ...input,
  generatedBy: "user-1",
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeDeps(overrides: Partial<EditarInformeDeps> = {}): EditarInformeDeps {
  return {
    getReport: vi.fn().mockResolvedValue({ interviewId: "iv-1" }),
    updateReport: vi.fn().mockResolvedValue(savedRow),
    ...overrides,
  };
}

describe("editarInformeEntrevista", () => {
  it("rechaza roles sin ai.use", async () => {
    const deps = makeDeps();
    const res = await editarInformeEntrevista(input, { ...ctx, role: "viewer" }, deps);
    expect(res.ok).toBe(false);
    expect(deps.getReport).not.toHaveBeenCalled();
  });

  it("rechaza si el informe no existe (o es de otra org)", async () => {
    const deps = makeDeps({ getReport: vi.fn().mockResolvedValue(null) });
    const res = await editarInformeEntrevista(input, ctx, deps);
    expect(res).toEqual({ ok: false, error: "Informe no encontrado." });
    expect(deps.updateReport).not.toHaveBeenCalled();
  });

  it("persiste la edición sin volver a llamar a la IA", async () => {
    const deps = makeDeps();
    const res = await editarInformeEntrevista(input, ctx, deps);
    expect(res).toEqual({ ok: true, data: savedRow });
    const { interviewId, ...patch } = input;
    expect(deps.updateReport).toHaveBeenCalledWith(interviewId, patch);
  });
});
