import { describe, it, expect, vi } from "vitest";
import { postularCandidato } from "./postular-candidato";
import type { PostularDeps, PostularContext, ApplicationRow } from "./postular-candidato";

const makeApp = (overrides?: Partial<ApplicationRow>): ApplicationRow => ({
  id: "app-1",
  organizationId: "org-1",
  jobId: "job-1",
  candidateId: "cand-1",
  stage: "new",
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const makeDeps = (overrides?: Partial<PostularDeps>): PostularDeps => ({
  getJobById: vi.fn().mockResolvedValue({ id: "job-1", status: "open" }),
  getCandidateById: vi.fn().mockResolvedValue({ id: "cand-1" }),
  findExistingApplication: vi.fn().mockResolvedValue(null),
  createApplication: vi.fn().mockResolvedValue(makeApp()),
  ...overrides,
});

const ctx: PostularContext = {
  userId: "user-1",
  organizationId: "org-1",
  role: "recruiter",
};

const input = { jobId: "job-1", candidateId: "cand-1" };

describe("postularCandidato", () => {
  it("crea la application en etapa 'new' con datos correctos", async () => {
    const deps = makeDeps();
    const result = await postularCandidato(input, ctx, deps);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.stage).toBe("new");
    expect(deps.createApplication).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: "job-1", candidateId: "cand-1", stage: "new" }),
    );
  });

  it("rechaza si el candidato ya está postulado al mismo job", async () => {
    const deps = makeDeps({
      findExistingApplication: vi.fn().mockResolvedValue({ id: "app-existing" }),
    });
    const result = await postularCandidato(input, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/ya está postulado/i);
  });

  it("rechaza si el job está cerrado", async () => {
    const deps = makeDeps({
      getJobById: vi.fn().mockResolvedValue({ id: "job-1", status: "closed" }),
    });
    const result = await postularCandidato(input, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/cerrada/i);
  });

  it("rechaza si el job no existe", async () => {
    const deps = makeDeps({
      getJobById: vi.fn().mockResolvedValue(null),
    });
    const result = await postularCandidato(input, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no encontrada/i);
  });

  it("rechaza si el candidato no existe en la org", async () => {
    const deps = makeDeps({
      getCandidateById: vi.fn().mockResolvedValue(null),
    });
    const result = await postularCandidato(input, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no encontrado/i);
  });

  it("rechaza si el rol es consultant", async () => {
    const deps = makeDeps();
    const result = await postularCandidato(input, { ...ctx, role: "consultant" }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/consultores/i);
  });
});
