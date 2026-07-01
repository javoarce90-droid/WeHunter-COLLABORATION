import { describe, it, expect, vi } from "vitest";
import { editarWorkspace } from "./editar-workspace";
import type { WorkspaceContext, EditarWorkspaceDeps } from "./editar-workspace";

const owner: WorkspaceContext = { organizationId: "org-1", role: "owner" };
const deps = (): EditarWorkspaceDeps => ({ updateOrganization: vi.fn().mockResolvedValue(undefined) });
const base = { name: "Acme", careerSiteEnabled: true, branding: {} };

describe("editarWorkspace", () => {
  it("el owner edita nombre y branding del Career Site", async () => {
    const d = deps();
    const r = await editarWorkspace(
      { ...base, branding: { description: "Somos una consultora", primaryColor: "#6D28D9" } },
      owner,
      d,
    );
    expect(r.ok).toBe(true);
    expect(d.updateOrganization).toHaveBeenCalledWith("org-1", {
      name: "Acme",
      careerSiteEnabled: true,
      careerSiteSettings: { description: "Somos una consultora", primaryColor: "#6D28D9" },
    });
  });

  it("un admin también puede editar", async () => {
    const d = deps();
    const r = await editarWorkspace(base, { ...owner, role: "admin" }, d);
    expect(r.ok).toBe(true);
  });

  it("un recruiter no puede editar el workspace", async () => {
    const d = deps();
    const r = await editarWorkspace(base, { ...owner, role: "recruiter" }, d);
    expect(r.ok).toBe(false);
    expect(d.updateOrganization).not.toHaveBeenCalled();
  });

  it("rechaza nombre vacío", async () => {
    const d = deps();
    const r = await editarWorkspace({ ...base, name: "   " }, owner, d);
    expect(r.ok).toBe(false);
    expect(d.updateOrganization).not.toHaveBeenCalled();
  });

  it("incluye el logo solo si vino un path nuevo", async () => {
    const d = deps();
    await editarWorkspace({ ...base, logoPath: "org-1/logo.png" }, owner, d);
    expect(d.updateOrganization).toHaveBeenCalledWith("org-1", {
      name: "Acme",
      careerSiteEnabled: true,
      careerSiteSettings: {},
      logoUrl: "org-1/logo.png",
    });
  });

  it("incluye la portada solo si vino un path nuevo", async () => {
    const d = deps();
    await editarWorkspace({ ...base, coverPath: "org-1/cover.png" }, owner, d);
    expect(d.updateOrganization).toHaveBeenCalledWith("org-1", {
      name: "Acme",
      careerSiteEnabled: true,
      careerSiteSettings: {},
      careerSiteCoverUrl: "org-1/cover.png",
    });
  });

  it("puede despublicar el Career Site", async () => {
    const d = deps();
    await editarWorkspace({ ...base, careerSiteEnabled: false }, owner, d);
    expect(d.updateOrganization).toHaveBeenCalledWith("org-1", {
      name: "Acme",
      careerSiteEnabled: false,
      careerSiteSettings: {},
    });
  });
});
