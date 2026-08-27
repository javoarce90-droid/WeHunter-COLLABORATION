import { describe, it, expect, vi } from "vitest";
import {
  procesarCvParaPool,
  type ProcesarCvParaPoolDeps,
  type ExtractedCv,
} from "./procesar-cv-para-pool";

const draft = (over: Record<string, unknown> = {}) => ({
  fullName: "Ada Lovelace",
  email: "ada@acme.com",
  phone: null,
  headline: "Ingeniera",
  location: null,
  linkedinUrl: null,
  summary: "Resumen",
  skills: [],
  workExperiences: [],
  education: [],
  certifications: [],
  ...over,
});

const ctx = { organizationId: "org-1", role: "recruiter" as const };
const extracted: ExtractedCv = { cv: { cvText: "un cv" }, cvUrl: "cvs/org-1/x.pdf" };

function deps(over: Partial<ProcesarCvParaPoolDeps> = {}): ProcesarCvParaPoolDeps {
  return {
    draftProfile: vi.fn(async () => draft()),
    cargarCandidato: vi.fn(async () => ({ ok: true as const, data: { candidateId: "c-1" } })),
    persistResume: vi.fn(async () => {}),
    ...over,
  };
}

describe("procesarCvParaPool", () => {
  it("rechaza a un rol sin candidates.manage", async () => {
    const d = deps();
    const res = await procesarCvParaPool(extracted, { ...ctx, role: "viewer" }, d);
    expect(res).toEqual({ status: "failed", reason: "Sin permisos para cargar candidatos." });
    expect(d.draftProfile).not.toHaveBeenCalled();
  });

  it("propaga el error de extracción como fallo", async () => {
    const d = deps();
    const res = await procesarCvParaPool({ error: "No se pudo leer el .docx." }, ctx, d);
    expect(res).toEqual({ status: "failed", reason: "No se pudo leer el .docx." });
    expect(d.draftProfile).not.toHaveBeenCalled();
  });

  it("marca fallido si la IA cae al mock (extractionFailed)", async () => {
    const d = deps({ draftProfile: vi.fn(async () => draft({ extractionFailed: true })) });
    const res = await procesarCvParaPool(extracted, ctx, d);
    expect(res).toEqual({ status: "failed", reason: "No se pudo extraer el perfil del CV." });
  });

  it("distingue el fallo por cuota de IA (429) y lo marca quotaExhausted", async () => {
    const d = deps({
      draftProfile: vi.fn(async () => draft({ extractionFailed: true, failureReason: "quota" })),
    });
    const res = await procesarCvParaPool(extracted, ctx, d);
    expect(res).toEqual({
      status: "failed",
      reason: "Cuota de IA agotada — probá más tarde.",
      quotaExhausted: true,
    });
  });

  it("falla si el CV no trae email", async () => {
    const d = deps({ draftProfile: vi.fn(async () => draft({ email: null })) });
    const res = await procesarCvParaPool(extracted, ctx, d);
    expect(res).toEqual({ status: "failed", reason: "El CV no tiene un email de contacto." });
    expect(d.cargarCandidato).not.toHaveBeenCalled();
  });

  it("falla si el CV no trae nombre", async () => {
    const d = deps({ draftProfile: vi.fn(async () => draft({ fullName: "  " })) });
    const res = await procesarCvParaPool(extracted, ctx, d);
    expect(res).toEqual({
      status: "failed",
      reason: "No se pudo identificar el nombre en el CV.",
    });
  });

  it("duplicado → skipped_duplicate con el nombre del candidato existente", async () => {
    const d = deps({
      cargarCandidato: vi.fn(async () => ({
        ok: false as const,
        error: "dup",
        duplicate: { id: "x", fullName: "Ada Lovelace", matchedBy: "email" as const },
      })),
    });
    const res = await procesarCvParaPool(extracted, ctx, d);
    expect(res).toEqual({
      status: "skipped_duplicate",
      candidateId: "x",
      candidateName: "Ada Lovelace",
    });
    expect(d.persistResume).not.toHaveBeenCalled();
  });

  it("happy path → created con nombre, currículum persistido", async () => {
    const d = deps({
      draftProfile: vi.fn(async () =>
        draft({
          fullName: "  Ada Lovelace  ",
          workExperiences: [
            { company: "Acme", position: "Dev", startDate: null, endDate: null, description: null, employmentType: null, modality: null, skills: [] },
          ],
        }),
      ),
    });
    const res = await procesarCvParaPool(extracted, ctx, d);
    expect(res).toEqual({
      status: "created",
      candidateId: "c-1",
      candidateName: "Ada Lovelace",
    });
    expect(d.cargarCandidato).toHaveBeenCalledWith(
      expect.objectContaining({ email: "ada@acme.com", existingCvUrl: "cvs/org-1/x.pdf", skipProfileLink: true }),
    );
    expect(d.persistResume).toHaveBeenCalledTimes(1);
  });
});
