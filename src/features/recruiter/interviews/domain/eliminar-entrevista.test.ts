import { describe, it, expect, vi } from "vitest";
import { eliminarEntrevista } from "./eliminar-entrevista";
import type {
  EliminarEntrevistaDeps,
  EliminarEntrevistaContext,
} from "./eliminar-entrevista";
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

const makeDeps = (overrides?: Partial<EliminarEntrevistaDeps>): EliminarEntrevistaDeps => ({
  getInterviewById: vi.fn().mockResolvedValue(existing),
  deleteInterview: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const ctx: EliminarEntrevistaContext = {
  userId: "user-1",
  organizationId: "org-1",
  role: "recruiter",
};

describe("eliminarEntrevista", () => {
  it("elimina la entrevista", async () => {
    const deps = makeDeps();
    const result = await eliminarEntrevista({ interviewId: "int-1" }, ctx, deps);
    expect(result.ok).toBe(true);
    expect(deps.deleteInterview).toHaveBeenCalledWith("int-1");
  });

  it("rechaza si no pertenece a la org", async () => {
    const deps = makeDeps({ getInterviewById: vi.fn().mockResolvedValue(null) });
    const result = await eliminarEntrevista({ interviewId: "int-1" }, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no encontrada/i);
    expect(deps.deleteInterview).not.toHaveBeenCalled();
  });

  it("rechaza si el rol es consultant", async () => {
    const deps = makeDeps();
    const result = await eliminarEntrevista(
      { interviewId: "int-1" },
      { ...ctx, role: "consultant" },
      deps,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/consultores/i);
  });
});
