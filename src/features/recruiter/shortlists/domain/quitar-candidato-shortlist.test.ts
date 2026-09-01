import { describe, it, expect, vi } from "vitest";
import { quitarCandidatoDeShortlist } from "./quitar-candidato-shortlist";
import type {
  QuitarCandidatoShortlistDeps,
  QuitarCandidatoShortlistContext,
} from "./quitar-candidato-shortlist";

const makeDeps = (
  overrides?: Partial<QuitarCandidatoShortlistDeps>,
): QuitarCandidatoShortlistDeps => ({
  getShortlistCandidateById: vi.fn().mockResolvedValue({ id: "sc-1" }),
  removeShortlistCandidate: vi.fn().mockResolvedValue({ removed: true }),
  ...overrides,
});

const ctx: QuitarCandidatoShortlistContext = {
  organizationId: "org-1",
  role: "recruiter",
};

describe("quitarCandidatoDeShortlist", () => {
  it("quita el candidato de la shortlist", async () => {
    const deps = makeDeps();
    const result = await quitarCandidatoDeShortlist({ shortlistCandidateId: "sc-1" }, ctx, deps);
    expect(result.ok).toBe(true);
    expect(deps.removeShortlistCandidate).toHaveBeenCalledWith("sc-1", "org-1");
  });

  it("rechaza al consultant", async () => {
    const deps = makeDeps();
    const result = await quitarCandidatoDeShortlist(
      { shortlistCandidateId: "sc-1" },
      { ...ctx, role: "consultant" },
      deps,
    );
    expect(result.ok).toBe(false);
    expect(deps.removeShortlistCandidate).not.toHaveBeenCalled();
  });

  it("rechaza si el candidato no está en una shortlist de la org", async () => {
    const deps = makeDeps({ getShortlistCandidateById: vi.fn().mockResolvedValue(null) });
    const result = await quitarCandidatoDeShortlist({ shortlistCandidateId: "sc-x" }, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no está en esta shortlist/i);
    expect(deps.removeShortlistCandidate).not.toHaveBeenCalled();
  });

  it("error si el borrado no afectó ninguna fila", async () => {
    const deps = makeDeps({ removeShortlistCandidate: vi.fn().mockResolvedValue({ removed: false }) });
    const result = await quitarCandidatoDeShortlist({ shortlistCandidateId: "sc-1" }, ctx, deps);
    expect(result.ok).toBe(false);
  });
});
