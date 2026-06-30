import { describe, it, expect, vi } from "vitest";
import { editarWorkspace } from "./editar-workspace";
import type { WorkspaceContext, EditarWorkspaceDeps } from "./editar-workspace";

const owner: WorkspaceContext = { organizationId: "org-1", role: "owner" };
const deps = (): EditarWorkspaceDeps => ({ updateOrganization: vi.fn().mockResolvedValue(undefined) });

describe("editarWorkspace", () => {
  it("el owner edita nombre y zona horaria", async () => {
    const d = deps();
    const r = await editarWorkspace({ name: "Acme", timezone: "America/Argentina/Buenos_Aires" }, owner, d);
    expect(r.ok).toBe(true);
    expect(d.updateOrganization).toHaveBeenCalledWith("org-1", {
      name: "Acme",
      preferences: { timezone: "America/Argentina/Buenos_Aires" },
    });
  });

  it("un admin también puede editar", async () => {
    const d = deps();
    const r = await editarWorkspace({ name: "Acme" }, { ...owner, role: "admin" }, d);
    expect(r.ok).toBe(true);
  });

  it("un recruiter no puede editar el workspace", async () => {
    const d = deps();
    const r = await editarWorkspace({ name: "Acme" }, { ...owner, role: "recruiter" }, d);
    expect(r.ok).toBe(false);
    expect(d.updateOrganization).not.toHaveBeenCalled();
  });

  it("rechaza nombre vacío", async () => {
    const d = deps();
    const r = await editarWorkspace({ name: "   " }, owner, d);
    expect(r.ok).toBe(false);
    expect(d.updateOrganization).not.toHaveBeenCalled();
  });

  it("incluye el logo solo si vino un path nuevo", async () => {
    const d = deps();
    await editarWorkspace({ name: "Acme", logoPath: "org-1/logo.png" }, owner, d);
    expect(d.updateOrganization).toHaveBeenCalledWith("org-1", {
      name: "Acme",
      preferences: { timezone: undefined },
      logoUrl: "org-1/logo.png",
    });
  });
});
