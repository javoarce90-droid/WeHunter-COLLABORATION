import { describe, it, expect, vi } from "vitest";
import {
  listarEntrevistasPendientesInforme,
  type ListarPendientesDeps,
  type PendingReportInterview,
} from "./listar-entrevistas-pendientes-informe";

const rows: PendingReportInterview[] = [
  {
    id: "iv-1",
    applicationId: "app-1",
    jobId: "job-1",
    scheduledAt: new Date(),
    candidateName: "Ana",
    jobTitle: "Frontend",
  },
];

function makeDeps(): ListarPendientesDeps {
  return { listPendingReports: vi.fn().mockResolvedValue(rows) };
}

const now = new Date("2026-08-28T12:00:00Z");

describe("listarEntrevistasPendientesInforme", () => {
  it("devuelve vacío si el rol no tiene interviews.manage", async () => {
    const deps = makeDeps();
    const res = await listarEntrevistasPendientesInforme(
      { organizationId: "org-1", role: "viewer", now },
      deps,
    );
    expect(res).toEqual([]);
    expect(deps.listPendingReports).not.toHaveBeenCalled();
  });

  it("lista las entrevistas pendientes de informe para roles con interviews.manage", async () => {
    const deps = makeDeps();
    const res = await listarEntrevistasPendientesInforme(
      { organizationId: "org-1", role: "recruiter", now },
      deps,
    );
    expect(res).toEqual(rows);
    expect(deps.listPendingReports).toHaveBeenCalledWith("org-1", now, 5);
  });
});
