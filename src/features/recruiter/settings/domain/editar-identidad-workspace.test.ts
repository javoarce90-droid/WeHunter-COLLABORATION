import { describe, it, expect, vi } from "vitest";
import { editarIdentidadWorkspace } from "./editar-identidad-workspace";
import type { WorkspaceContext, EditarIdentidadWorkspaceDeps } from "./editar-identidad-workspace";

const owner: WorkspaceContext = { organizationId: "org-1", role: "owner" };
const deps = (): EditarIdentidadWorkspaceDeps => ({
  updateOrganization: vi.fn().mockResolvedValue(undefined),
});
const base = { name: "Acme" };

describe("editarIdentidadWorkspace", () => {
  it("el owner edita el nombre del workspace", async () => {
    const d = deps();
    const r = await editarIdentidadWorkspace(base, owner, d);
    expect(r.ok).toBe(true);
    expect(d.updateOrganization).toHaveBeenCalledWith("org-1", { name: "Acme" });
  });

  it("rechaza nombre vacío", async () => {
    const d = deps();
    const r = await editarIdentidadWorkspace({ name: "   " }, owner, d);
    expect(r.ok).toBe(false);
    expect(d.updateOrganization).not.toHaveBeenCalled();
  });

  it("incluye el logo solo si vino un path nuevo", async () => {
    const d = deps();
    await editarIdentidadWorkspace({ ...base, logoPath: "org-1/logo.png" }, owner, d);
    expect(d.updateOrganization).toHaveBeenCalledWith("org-1", {
      name: "Acme",
      logoUrl: "org-1/logo.png",
    });
  });

  it("un admin también puede editar", async () => {
    const d = deps();
    const r = await editarIdentidadWorkspace(base, { ...owner, role: "admin" }, d);
    expect(r.ok).toBe(true);
  });

  it("un recruiter no puede editar el workspace", async () => {
    const d = deps();
    const r = await editarIdentidadWorkspace(base, { ...owner, role: "recruiter" }, d);
    expect(r.ok).toBe(false);
    expect(d.updateOrganization).not.toHaveBeenCalled();
  });
});
