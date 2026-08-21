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
