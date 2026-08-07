import { describe, it, expect, vi } from "vitest";
import { solicitarEntrevistaInterno } from "./solicitar-entrevista-interno";
import type {
  SolicitarEntrevistaInternoCtx,
  SolicitarEntrevistaInternoDeps,
} from "./solicitar-entrevista-interno";

const makeDeps = (
  overrides?: Partial<SolicitarEntrevistaInternoDeps>,
): SolicitarEntrevistaInternoDeps => ({
  getActiveShareForCandidate: vi.fn().mockResolvedValue({ shareId: "share-1" }),
  requestInterview: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const ctx: SolicitarEntrevistaInternoCtx = {
  organizationId: "org-1",
  role: "hiring_manager",
  membershipId: "mem-hm",
};

const future = (daysFromNow: number) =>
  new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();

const input = { shortlistCandidateId: "sc-1", slots: [future(1), future(2)] };

describe("solicitarEntrevistaInterno", () => {
  it("solicita la entrevista cuando el HM tiene acceso al candidato", async () => {
    const deps = makeDeps();
    const result = await solicitarEntrevistaInterno(input, ctx, deps);
    expect(result.ok).toBe(true);
    expect(deps.requestInterview).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        shortlistCandidateId: "sc-1",
        slots: [new Date(input.slots[0]!), new Date(input.slots[1]!)],
      }),
    );
  });

  it("rechaza si no propone ningún horario", async () => {
    const deps = makeDeps();
    const result = await solicitarEntrevistaInterno({ ...input, slots: [] }, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/al menos un horario/i);
    expect(deps.requestInterview).not.toHaveBeenCalled();
  });

  it("rechaza un candidato de un shortlist no compartido con este HM", async () => {
    const deps = makeDeps({ getActiveShareForCandidate: vi.fn().mockResolvedValue(null) });
    const result = await solicitarEntrevistaInterno(input, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no tenés acceso/i);
    expect(deps.requestInterview).not.toHaveBeenCalled();
  });

  it("rechaza roles sin la capability (ej. sourcer)", async () => {
    const deps = makeDeps();
    const result = await solicitarEntrevistaInterno(input, { ...ctx, role: "sourcer" }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no permite/i);
    expect(deps.requestInterview).not.toHaveBeenCalled();
  });
});
