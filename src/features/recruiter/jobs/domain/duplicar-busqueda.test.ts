import { describe, it, expect, vi } from "vitest";
import { duplicarBusqueda, type DuplicarBusquedaDeps } from "./duplicar-busqueda";
import type { Job } from "@/db/schema";

const original = {
  id: "job-1",
  organizationId: "org-1",
  title: "Backend Engineer",
  description: "Node + Postgres",
  posting: null,
  clientId: null,
  position: "Backend Engineer Senior",
  jobArea: "tecnologia",
  location: "Remoto",
  modality: "remote",
  seniority: "senior",
  employmentType: "full_time",
  salaryMin: 3000,
  salaryMax: 5000,
  salaryCurrency: "USD",
  skills: ["Node", "Postgres"],
  priority: "high",
  deadline: null,
  vacancies: 2,
  objectives: null,
  requirements: null,
  responsibilities: null,
  benefits: null,
  status: "open",
  createdBy: "u1",
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Job;

function deps(found: Job | null = original, jobId = "job-9"): DuplicarBusquedaDeps {
  return {
    getJobById: vi.fn(async () => found),
    insertJob: vi.fn(async () => ({ jobId })),
  };
}
const ctx = { userId: "u1", organizationId: "org-1", role: "recruiter" as const };

describe("duplicarBusqueda", () => {
  it("rechaza sin sesión/organization", async () => {
    const d = deps();
    const res = await duplicarBusqueda(
      { jobId: "job-1" },
      { userId: null, organizationId: null, role: null },
      d,
    );
    expect(res.ok).toBe(false);
    expect(d.insertJob).not.toHaveBeenCalled();
  });

  it("rechaza al consultor (no gestiona búsquedas)", async () => {
    const d = deps();
    const res = await duplicarBusqueda({ jobId: "job-1" }, { ...ctx, role: "consultant" }, d);
    expect(res.ok).toBe(false);
    expect(d.insertJob).not.toHaveBeenCalled();
  });

  it("falla si la búsqueda original no existe (o no es de la org)", async () => {
    const d = deps(null);
    const res = await duplicarBusqueda({ jobId: "job-1" }, ctx, d);
    expect(res.ok).toBe(false);
    expect(d.insertJob).not.toHaveBeenCalled();
  });

  it("crea una copia en borrador con el título sufijado y los mismos campos ricos", async () => {
    const d = deps(original, "job-9");
    const res = await duplicarBusqueda({ jobId: "job-1" }, ctx, d);
    expect(res).toEqual({ ok: true, data: { jobId: "job-9" } });
    expect(d.insertJob).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        title: "Backend Engineer (copia)",
        description: "Node + Postgres",
        createdBy: "u1",
        position: "Backend Engineer Senior",
        skills: ["Node", "Postgres"],
        salaryMin: 3000,
        salaryMax: 5000,
      }),
    );
  });
});
