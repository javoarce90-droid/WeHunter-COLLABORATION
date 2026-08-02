import { describe, it, expect, vi } from "vitest";
import { eliminarWorkspace } from "./eliminar-workspace";
import type { EliminarWorkspaceContext, EliminarWorkspaceDeps } from "./eliminar-workspace";

const owner: EliminarWorkspaceContext = {
  organizationId: "org-1",
  organizationName: "Consultora Talento",
  role: "owner",
};
const deps = (): EliminarWorkspaceDeps => ({ deleteOrganization: vi.fn().mockResolvedValue(undefined) });

describe("eliminarWorkspace", () => {
  it("el owner elimina el workspace escribiendo el nombre exacto", async () => {
    const d = deps();
    const r = await eliminarWorkspace({ confirmName: "Consultora Talento" }, owner, d);
    expect(r.ok).toBe(true);
    expect(d.deleteOrganization).toHaveBeenCalledWith("org-1");
  });

  it("rechaza si el nombre escrito no coincide", async () => {
    const d = deps();
    const r = await eliminarWorkspace({ confirmName: "Otro nombre" }, owner, d);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/no coincide/);
    expect(d.deleteOrganization).not.toHaveBeenCalled();
  });

  it("un admin no puede eliminar el workspace", async () => {
    const d = deps();
    const r = await eliminarWorkspace(
      { confirmName: "Consultora Talento" },
      { ...owner, role: "admin" },
      d,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/propietario/);
    expect(d.deleteOrganization).not.toHaveBeenCalled();
  });

  it("un recruiter no puede eliminar el workspace", async () => {
    const d = deps();
    const r = await eliminarWorkspace(
      { confirmName: "Consultora Talento" },
      { ...owner, role: "recruiter" },
      d,
    );
    expect(r.ok).toBe(false);
    expect(d.deleteOrganization).not.toHaveBeenCalled();
  });
});
