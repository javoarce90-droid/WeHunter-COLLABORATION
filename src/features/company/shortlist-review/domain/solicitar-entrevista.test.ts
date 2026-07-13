import { describe, it, expect, vi } from "vitest";
import { solicitarEntrevista } from "./solicitar-entrevista";
import type { SolicitarEntrevistaDeps } from "./solicitar-entrevista";

const makeDeps = (overrides?: Partial<SolicitarEntrevistaDeps>): SolicitarEntrevistaDeps => ({
  requestInterview: vi.fn().mockResolvedValue(true),
  ...overrides,
});

const input = { token: "tok_abc", shortlistCandidateId: "sc-1" };

describe("solicitarEntrevista", () => {
  it("solicita la entrevista con token y candidato válidos", async () => {
    const deps = makeDeps();
    const result = await solicitarEntrevista(input, deps);
    expect(result.ok).toBe(true);
    expect(deps.requestInterview).toHaveBeenCalledWith(input);
  });

  it("rechaza si falta el token", async () => {
    const deps = makeDeps();
    const result = await solicitarEntrevista({ ...input, token: "" }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/inválido/i);
    expect(deps.requestInterview).not.toHaveBeenCalled();
  });

  it("rechaza si falta el candidato", async () => {
    const deps = makeDeps();
    const result = await solicitarEntrevista({ ...input, shortlistCandidateId: "" }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/inválido/i);
    expect(deps.requestInterview).not.toHaveBeenCalled();
  });

  it("propaga el rechazo de la función definer (token vencido)", async () => {
    const deps = makeDeps({ requestInterview: vi.fn().mockResolvedValue(false) });
    const result = await solicitarEntrevista(input, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/vencido/i);
  });
});
