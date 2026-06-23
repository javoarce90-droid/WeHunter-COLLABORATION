import { describe, it, expect, vi } from "vitest";
import { actualizarEntrevista } from "./actualizar-entrevista";
import type {
  ActualizarEntrevistaDeps,
  ActualizarEntrevistaContext,
} from "./actualizar-entrevista";
import type { InterviewRow } from "./agendar-entrevista";

const existing: InterviewRow = {
  id: "int-1",
  organizationId: "org-1",
  applicationId: "app-1",
  scheduledAt: new Date("2026-07-01T10:00:00Z"),
  mode: "remote",
  location: null,
  notes: null,
  status: "scheduled",
};

const makeDeps = (
  overrides?: Partial<ActualizarEntrevistaDeps>,
): ActualizarEntrevistaDeps => ({
  getInterviewById: vi.fn().mockResolvedValue(existing),
  updateInterview: vi.fn().mockImplementation((id, data) =>
    Promise.resolve({ ...existing, id, ...data }),
  ),
  ...overrides,
});

const ctx: ActualizarEntrevistaContext = {
  userId: "user-1",
  organizationId: "org-1",
  role: "recruiter",
};

const input = {
  interviewId: "int-1",
  scheduledAt: new Date("2026-07-02T15:00:00Z"),
  mode: "onsite" as const,
  status: "completed" as const,
  location: "Oficina central",
  notes: "Fue muy bien.",
};

describe("actualizarEntrevista", () => {
  it("actualiza la entrevista (reprograma y marca realizada)", async () => {
    const deps = makeDeps();
    const result = await actualizarEntrevista(input, ctx, deps);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.status).toBe("completed");
    expect(deps.updateInterview).toHaveBeenCalledWith(
      "int-1",
      expect.objectContaining({
        mode: "onsite",
        status: "completed",
        location: "Oficina central",
        notes: "Fue muy bien.",
      }),
    );
  });

  it("permite marcar una entrevista en fecha pasada (realizada)", async () => {
    const deps = makeDeps();
    const result = await actualizarEntrevista(
      { ...input, scheduledAt: new Date("2020-01-01T10:00:00Z") },
      ctx,
      deps,
    );
    expect(result.ok).toBe(true);
  });

  it("rechaza si la entrevista no pertenece a la org", async () => {
    const deps = makeDeps({ getInterviewById: vi.fn().mockResolvedValue(null) });
    const result = await actualizarEntrevista(input, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no encontrada/i);
  });

  it("rechaza si el rol es consultant", async () => {
    const deps = makeDeps();
    const result = await actualizarEntrevista(input, { ...ctx, role: "consultant" }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/consultores/i);
  });
});
