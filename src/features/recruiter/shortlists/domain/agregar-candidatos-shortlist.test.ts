import { describe, it, expect, vi } from "vitest";
import { agregarCandidatosAShortlist } from "./agregar-candidatos-shortlist";
import type {
  AgregarCandidatosShortlistDeps,
  AgregarCandidatosShortlistContext,
} from "./agregar-candidatos-shortlist";

const makeDeps = (
  overrides?: Partial<AgregarCandidatosShortlistDeps>,
): AgregarCandidatosShortlistDeps => ({
  getShortlistById: vi.fn().mockResolvedValue({ id: "sl-1", jobId: "job-1" }),
  filterValidApplications: vi.fn().mockResolvedValue(["app-3", "app-4"]),
  addCandidatesToShortlist: vi.fn().mockResolvedValue({ added: 2 }),
  ...overrides,
});

const ctx: AgregarCandidatosShortlistContext = {
  userId: "user-1",
  organizationId: "org-1",
  role: "recruiter",
};

const input = { shortlistId: "sl-1", applicationIds: ["app-3", "app-4"] };

describe("agregarCandidatosAShortlist", () => {
  it("agrega los candidatos válidos y devuelve cuántos se sumaron", async () => {
    const deps = makeDeps();
    const result = await agregarCandidatosAShortlist(input, ctx, deps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.added).toBe(2);
    expect(deps.addCandidatesToShortlist).toHaveBeenCalledWith(
      expect.objectContaining({ shortlistId: "sl-1", applicationIds: ["app-3", "app-4"] }),
    );
  });

  it("rechaza al consultant", async () => {
    const deps = makeDeps();
    const result = await agregarCandidatosAShortlist(input, { ...ctx, role: "consultant" }, deps);
    expect(result.ok).toBe(false);
    expect(deps.addCandidatesToShortlist).not.toHaveBeenCalled();
  });

  it("rechaza si no se seleccionó ningún candidato", async () => {
    const deps = makeDeps();
    const result = await agregarCandidatosAShortlist(
      { ...input, applicationIds: [] },
      ctx,
      deps,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/al menos un candidato/i);
  });

  it("rechaza si la shortlist no es de la org", async () => {
    const deps = makeDeps({ getShortlistById: vi.fn().mockResolvedValue(null) });
    const result = await agregarCandidatosAShortlist(input, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no encontrada/i);
  });

  it("valida las applications contra el job de la shortlist, no contra uno que venga del cliente", async () => {
    const filterValidApplications = vi.fn().mockResolvedValue(["app-3"]);
    const deps = makeDeps({ filterValidApplications });
    await agregarCandidatosAShortlist(
      { shortlistId: "sl-1", applicationIds: ["app-3", "app-ajena"] },
      ctx,
      deps,
    );
    expect(filterValidApplications).toHaveBeenCalledWith("job-1", "org-1", [
      "app-3",
      "app-ajena",
    ]);
    expect(deps.addCandidatesToShortlist).toHaveBeenCalledWith(
      expect.objectContaining({ applicationIds: ["app-3"] }),
    );
  });

  it("rechaza si ninguna application seleccionada es válida", async () => {
    const deps = makeDeps({ filterValidApplications: vi.fn().mockResolvedValue([]) });
    const result = await agregarCandidatosAShortlist(input, ctx, deps);
    expect(result.ok).toBe(false);
    expect(deps.addCandidatesToShortlist).not.toHaveBeenCalled();
  });

  it("added=0 cuando todos ya estaban en la shortlist (insert idempotente)", async () => {
    const deps = makeDeps({ addCandidatesToShortlist: vi.fn().mockResolvedValue({ added: 0 }) });
    const result = await agregarCandidatosAShortlist(input, ctx, deps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.added).toBe(0);
  });
});
