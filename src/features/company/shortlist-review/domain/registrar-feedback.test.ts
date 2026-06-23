import { describe, it, expect, vi } from "vitest";
import { registrarFeedback } from "./registrar-feedback";
import type { RegistrarFeedbackDeps } from "./registrar-feedback";

const makeDeps = (overrides?: Partial<RegistrarFeedbackDeps>): RegistrarFeedbackDeps => ({
  submitFeedback: vi.fn().mockResolvedValue(true),
  ...overrides,
});

const input = {
  token: "tok_abc",
  shortlistCandidateId: "sc-1",
  decision: "approved",
  comment: "Nos interesa avanzar.",
};

describe("registrarFeedback", () => {
  it("registra el feedback con decisión válida", async () => {
    const deps = makeDeps();
    const result = await registrarFeedback(input, deps);
    expect(result.ok).toBe(true);
    expect(deps.submitFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ decision: "approved", comment: "Nos interesa avanzar." }),
    );
  });

  it("normaliza comentario vacío a null", async () => {
    const deps = makeDeps();
    await registrarFeedback({ ...input, comment: "   " }, deps);
    expect(deps.submitFeedback).toHaveBeenCalledWith(
      expect.objectContaining({ comment: null }),
    );
  });

  it("rechaza decisión inválida", async () => {
    const deps = makeDeps();
    const result = await registrarFeedback({ ...input, decision: "borrar" }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no es válida/i);
    expect(deps.submitFeedback).not.toHaveBeenCalled();
  });

  it("rechaza si falta el token", async () => {
    const deps = makeDeps();
    const result = await registrarFeedback({ ...input, token: "" }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/inválido/i);
  });

  it("rechaza comentario demasiado largo", async () => {
    const deps = makeDeps();
    const result = await registrarFeedback({ ...input, comment: "x".repeat(2001) }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/2\.000/);
  });

  it("propaga el rechazo de la función definer (token vencido)", async () => {
    const deps = makeDeps({ submitFeedback: vi.fn().mockResolvedValue(false) });
    const result = await registrarFeedback(input, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/vencido/i);
  });
});
