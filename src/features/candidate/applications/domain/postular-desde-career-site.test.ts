import { describe, it, expect, vi } from "vitest";
import { postularDesdeCareerSite } from "./postular-desde-career-site";
import type { PostularDesdeCareerSiteDeps } from "./postular-desde-career-site";

const makeDeps = (overrides?: Partial<PostularDesdeCareerSiteDeps>): PostularDesdeCareerSiteDeps => ({
  applyToJob: vi.fn().mockResolvedValue({ applicationId: "app-1", candidateId: "cand-1" }),
  ...overrides,
});

const input = {
  jobId: "job-1",
  fullName: "Juana Pérez",
  email: "juana@example.com",
  phone: "+54 9 11 1234-5678",
  coverNote: "Me interesa mucho la posición.",
  cvPath: "org-1/pending-user-1-uuid.pdf",
};

describe("postularDesdeCareerSite", () => {
  it("postula con datos válidos", async () => {
    const deps = makeDeps();
    const result = await postularDesdeCareerSite(input, deps);
    expect(result.ok).toBe(true);
    expect(deps.applyToJob).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: "job-1", fullName: "Juana Pérez", email: "juana@example.com" }),
    );
  });

  it("rechaza nombre vacío", async () => {
    const deps = makeDeps();
    const result = await postularDesdeCareerSite({ ...input, fullName: "   " }, deps);
    expect(result.ok).toBe(false);
    expect(deps.applyToJob).not.toHaveBeenCalled();
  });

  it("normaliza teléfono y nota vacíos a null", async () => {
    const deps = makeDeps();
    await postularDesdeCareerSite({ ...input, phone: "  ", coverNote: "  " }, deps);
    expect(deps.applyToJob).toHaveBeenCalledWith(
      expect.objectContaining({ phone: null, coverNote: null }),
    );
  });

  it("propaga el rechazo de la función definer (ya postulado / búsqueda no disponible)", async () => {
    const deps = makeDeps({ applyToJob: vi.fn().mockResolvedValue(null) });
    const result = await postularDesdeCareerSite(input, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no se pudo/i);
  });
});
