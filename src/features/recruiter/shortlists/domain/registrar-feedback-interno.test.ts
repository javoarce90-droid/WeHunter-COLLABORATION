import { describe, it, expect, vi } from "vitest";
import { registrarFeedbackInterno } from "./registrar-feedback-interno";
import type {
  RegistrarFeedbackInternoCtx,
  RegistrarFeedbackInternoDeps,
} from "./registrar-feedback-interno";

const makeDeps = (
  overrides?: Partial<RegistrarFeedbackInternoDeps>,
): RegistrarFeedbackInternoDeps => ({
  getActiveShareForCandidate: vi.fn().mockResolvedValue({ shareId: "share-1" }),
  submitFeedback: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const ctx: RegistrarFeedbackInternoCtx = {
  organizationId: "org-1",
  role: "hiring_manager",
  membershipId: "mem-hm",
};

const input = { shortlistCandidateId: "sc-1", decision: "approved", comment: "Me gusta." };

describe("registrarFeedbackInterno", () => {
  it("registra el feedback cuando el HM tiene acceso al candidato", async () => {
    const deps = makeDeps();
    const result = await registrarFeedbackInterno(input, ctx, deps);
    expect(result.ok).toBe(true);
    expect(deps.submitFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        shortlistCandidateId: "sc-1",
        shareId: "share-1",
        decision: "approved",
        comment: "Me gusta.",
      }),
    );
  });

  it("normaliza comentario vacío a null", async () => {
    const deps = makeDeps();
    await registrarFeedbackInterno({ ...input, comment: "   " }, ctx, deps);
    expect(deps.submitFeedback).toHaveBeenCalledWith(expect.objectContaining({ comment: null }));
  });

  it("rechaza decisión inválida", async () => {
    const deps = makeDeps();
    const result = await registrarFeedbackInterno({ ...input, decision: "borrar" }, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no es válida/i);
    expect(deps.submitFeedback).not.toHaveBeenCalled();
  });

  it("rechaza comentario demasiado largo", async () => {
    const deps = makeDeps();
    const result = await registrarFeedbackInterno({ ...input, comment: "x".repeat(2001) }, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/2\.000/);
    expect(deps.submitFeedback).not.toHaveBeenCalled();
  });

  it("rechaza un candidato de un shortlist no compartido con este HM", async () => {
    const deps = makeDeps({ getActiveShareForCandidate: vi.fn().mockResolvedValue(null) });
    const result = await registrarFeedbackInterno(input, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no tenés acceso/i);
    expect(deps.submitFeedback).not.toHaveBeenCalled();
  });

  it("rechaza roles sin la capability (ej. sourcer)", async () => {
    const deps = makeDeps();
    const result = await registrarFeedbackInterno(input, { ...ctx, role: "sourcer" }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no permite/i);
    expect(deps.submitFeedback).not.toHaveBeenCalled();
  });
});
