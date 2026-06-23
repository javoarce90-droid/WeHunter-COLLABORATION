import { describe, it, expect, vi } from "vitest";
import { crearShortlist } from "./crear-shortlist";
import type { CrearShortlistDeps, CrearShortlistContext } from "./crear-shortlist";

const makeDeps = (overrides?: Partial<CrearShortlistDeps>): CrearShortlistDeps => ({
  getJobById: vi.fn().mockResolvedValue({ id: "job-1" }),
  filterValidApplications: vi.fn().mockResolvedValue(["app-1", "app-2"]),
  createShortlistWithCandidates: vi.fn().mockResolvedValue({ shortlistId: "sl-1" }),
  ...overrides,
});

const ctx: CrearShortlistContext = {
  userId: "user-1",
  organizationId: "org-1",
  role: "recruiter",
};

const input = {
  jobId: "job-1",
  name: "Finalistas backend",
  applicationIds: ["app-1", "app-2"],
};

describe("crearShortlist", () => {
  it("crea el shortlist con los candidatos válidos", async () => {
    const deps = makeDeps();
    const result = await crearShortlist(input, ctx, deps);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.shortlistId).toBe("sl-1");
    expect(deps.createShortlistWithCandidates).toHaveBeenCalledWith(
      expect.objectContaining({ applicationIds: ["app-1", "app-2"], name: "Finalistas backend" }),
    );
  });

  it("rechaza si no se selecciona ningún candidato", async () => {
    const deps = makeDeps();
    const result = await crearShortlist({ ...input, applicationIds: [] }, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/al menos un candidato/i);
  });

  it("rechaza si el nombre es muy corto", async () => {
    const deps = makeDeps();
    const result = await crearShortlist({ ...input, name: "x" }, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/nombre/i);
  });

  it("rechaza si el job no existe en la org", async () => {
    const deps = makeDeps({ getJobById: vi.fn().mockResolvedValue(null) });
    const result = await crearShortlist(input, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no encontrada/i);
  });

  it("rechaza si ninguna application seleccionada es válida (anti cross-tenant)", async () => {
    const deps = makeDeps({ filterValidApplications: vi.fn().mockResolvedValue([]) });
    const result = await crearShortlist(input, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/válido/i);
    expect(deps.createShortlistWithCandidates).not.toHaveBeenCalled();
  });

  it("solo persiste las applications válidas, descartando las ajenas", async () => {
    const deps = makeDeps({
      filterValidApplications: vi.fn().mockResolvedValue(["app-1"]),
    });
    const result = await crearShortlist(
      { ...input, applicationIds: ["app-1", "app-ajena"] },
      ctx,
      deps,
    );
    expect(result.ok).toBe(true);
    expect(deps.createShortlistWithCandidates).toHaveBeenCalledWith(
      expect.objectContaining({ applicationIds: ["app-1"] }),
    );
  });

  it("rechaza si el rol es consultant", async () => {
    const deps = makeDeps();
    const result = await crearShortlist(input, { ...ctx, role: "consultant" }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/consultores/i);
  });
});
