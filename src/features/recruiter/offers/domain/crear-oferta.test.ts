import { describe, it, expect, vi } from "vitest";
import { crearOferta } from "./crear-oferta";
import type { CrearOfertaContext, CrearOfertaDeps, OfferRow } from "./crear-oferta";

const ctx: CrearOfertaContext = {
  userId: "user-1",
  organizationId: "org-1",
  role: "recruiter",
};

const offer: OfferRow = {
  id: "offer-1",
  organizationId: "org-1",
  jobId: "job-1",
  applicationId: "app-1",
  title: "Backend Senior",
  status: "draft",
};

const makeDeps = (over?: Partial<CrearOfertaDeps>): CrearOfertaDeps => ({
  getApplication: vi.fn().mockResolvedValue({ id: "app-1", jobId: "job-1" }),
  createOffer: vi.fn().mockResolvedValue(offer),
  ...over,
});

const input = {
  jobId: "job-1",
  applicationId: "app-1",
  title: "Backend Senior",
  salaryAmount: 2000,
};

describe("crearOferta", () => {
  it("crea la oferta en borrador", async () => {
    const deps = makeDeps();
    const res = await crearOferta(input, ctx, deps);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.status).toBe("draft");
    expect(deps.createOffer).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-1", createdBy: "user-1" }),
    );
  });

  it("rechaza al consultor", async () => {
    const res = await crearOferta(input, { ...ctx, role: "consultant" }, makeDeps());
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/consultor/i);
  });

  it("rechaza si la postulación no existe", async () => {
    const deps = makeDeps({ getApplication: vi.fn().mockResolvedValue(null) });
    const res = await crearOferta(input, ctx, deps);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/no encontrada/i);
  });

  it("rechaza si la postulación es de otro job", async () => {
    const deps = makeDeps({
      getApplication: vi.fn().mockResolvedValue({ id: "app-1", jobId: "otro-job" }),
    });
    const res = await crearOferta(input, ctx, deps);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/no pertenece/i);
  });

  it("rechaza título vacío", async () => {
    const res = await crearOferta({ ...input, title: "   " }, ctx, makeDeps());
    expect(res.ok).toBe(false);
  });
});
