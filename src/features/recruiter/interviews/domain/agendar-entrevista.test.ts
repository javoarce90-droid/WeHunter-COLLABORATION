import { describe, it, expect, vi } from "vitest";
import { agendarEntrevista } from "./agendar-entrevista";
import type {
  AgendarEntrevistaDeps,
  AgendarEntrevistaContext,
  InterviewRow,
} from "./agendar-entrevista";

const futureDate = new Date(Date.now() + 86_400_000); // mañana

const sampleRow: InterviewRow = {
  id: "int-1",
  organizationId: "org-1",
  applicationId: "app-1",
  scheduledAt: futureDate,
  mode: "remote",
  location: null,
  notes: null,
  status: "scheduled",
};

const makeDeps = (overrides?: Partial<AgendarEntrevistaDeps>): AgendarEntrevistaDeps => ({
  getApplicationById: vi.fn().mockResolvedValue({ id: "app-1" }),
  createInterview: vi.fn().mockImplementation((data) =>
    Promise.resolve({ ...sampleRow, ...data }),
  ),
  ...overrides,
});

const ctx: AgendarEntrevistaContext = {
  userId: "user-1",
  organizationId: "org-1",
  role: "recruiter",
};

const input = {
  applicationId: "app-1",
  scheduledAt: futureDate,
  mode: "remote" as const,
  location: "https://meet.example.com/abc",
  notes: "Entrevista técnica con el lead.",
};

describe("agendarEntrevista", () => {
  it("agenda una entrevista futura correctamente", async () => {
    const deps = makeDeps();
    const result = await agendarEntrevista(input, ctx, deps);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.applicationId).toBe("app-1");
    expect(deps.createInterview).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        applicationId: "app-1",
        mode: "remote",
        location: "https://meet.example.com/abc",
        notes: "Entrevista técnica con el lead.",
        createdBy: "user-1",
      }),
    );
  });

  it("normaliza location/notes vacíos a null", async () => {
    const deps = makeDeps();
    const result = await agendarEntrevista(
      { ...input, location: "   ", notes: "" },
      ctx,
      deps,
    );
    expect(result.ok).toBe(true);
    expect(deps.createInterview).toHaveBeenCalledWith(
      expect.objectContaining({ location: null, notes: null }),
    );
  });

  it("rechaza fechas en el pasado", async () => {
    const deps = makeDeps();
    const result = await agendarEntrevista(
      { ...input, scheduledAt: new Date(Date.now() - 86_400_000) },
      ctx,
      deps,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/futura/i);
    expect(deps.createInterview).not.toHaveBeenCalled();
  });

  it("rechaza si la application no pertenece a la org", async () => {
    const deps = makeDeps({ getApplicationById: vi.fn().mockResolvedValue(null) });
    const result = await agendarEntrevista(input, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no encontrada/i);
  });

  it("rechaza si el rol es consultant", async () => {
    const deps = makeDeps();
    const result = await agendarEntrevista(input, { ...ctx, role: "consultant" }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/consultores/i);
    expect(deps.getApplicationById).not.toHaveBeenCalled();
  });

  it("permite agendar siendo owner o admin", async () => {
    for (const role of ["owner", "admin"] as const) {
      const deps = makeDeps();
      const result = await agendarEntrevista(input, { ...ctx, role }, deps);
      expect(result.ok).toBe(true);
    }
  });
});
