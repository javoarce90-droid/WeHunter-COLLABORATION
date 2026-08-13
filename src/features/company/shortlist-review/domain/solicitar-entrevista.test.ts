import { describe, it, expect, vi } from "vitest";
import { solicitarEntrevista } from "./solicitar-entrevista";
import type { SolicitarEntrevistaDeps } from "./solicitar-entrevista";

const makeDeps = (overrides?: Partial<SolicitarEntrevistaDeps>): SolicitarEntrevistaDeps => ({
  requestInterview: vi.fn().mockResolvedValue(true),
  ...overrides,
});

const future = (daysFromNow: number) =>
  new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();

const input = {
  token: "tok_abc",
  shortlistCandidateId: "sc-1",
  slots: [future(1), future(2)],
};

describe("solicitarEntrevista", () => {
  it("solicita la entrevista con token, candidato y horarios válidos", async () => {
    const deps = makeDeps();
    const result = await solicitarEntrevista(input, deps);
    expect(result.ok).toBe(true);
    expect(deps.requestInterview).toHaveBeenCalledWith(
      expect.objectContaining({
        token: input.token,
        shortlistCandidateId: input.shortlistCandidateId,
        slots: [new Date(input.slots[0]!), new Date(input.slots[1]!)],
      }),
    );
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

  it("rechaza si no propone ningún horario", async () => {
    const deps = makeDeps();
    const result = await solicitarEntrevista({ ...input, slots: [] }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/al menos un horario/i);
    expect(deps.requestInterview).not.toHaveBeenCalled();
  });

  it("rechaza si propone más de 3 horarios", async () => {
    const deps = makeDeps();
    const result = await solicitarEntrevista(
      { ...input, slots: [future(1), future(2), future(3), future(4)] },
      deps,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/máximo 3/i);
    expect(deps.requestInterview).not.toHaveBeenCalled();
  });

  it("rechaza un horario a pasado", async () => {
    const deps = makeDeps();
    const result = await solicitarEntrevista(
      { ...input, slots: [new Date(Date.now() - 60_000).toISOString()] },
      deps,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/a futuro/i);
    expect(deps.requestInterview).not.toHaveBeenCalled();
  });

  it("rechaza horarios duplicados", async () => {
    const deps = makeDeps();
    const same = future(1);
    const result = await solicitarEntrevista({ ...input, slots: [same, same] }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no repitas/i);
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
