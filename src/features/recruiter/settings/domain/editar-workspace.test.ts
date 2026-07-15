import { describe, it, expect, vi } from "vitest";
import { editarWorkspace } from "./editar-workspace";
import type { WorkspaceContext, EditarWorkspaceDeps } from "./editar-workspace";
import { SlugTakenError } from "../data/settings.mutations";

const owner: WorkspaceContext = { organizationId: "org-1", role: "owner" };
const deps = (): EditarWorkspaceDeps => ({ updateOrganization: vi.fn().mockResolvedValue(undefined) });
const base = { name: "Acme", slug: "acme", branding: {} };

describe("editarWorkspace", () => {
  it("el owner edita nombre, slug y branding del Career Site", async () => {
    const d = deps();
    const r = await editarWorkspace(
      { ...base, branding: { description: "Somos una consultora", primaryColor: "#6D28D9" } },
      owner,
      d,
    );
    expect(r.ok).toBe(true);
    expect(d.updateOrganization).toHaveBeenCalledWith("org-1", {
      name: "Acme",
      slug: "acme",
      careerSiteSettings: { description: "Somos una consultora", primaryColor: "#6D28D9" },
    });
  });

  it("normaliza el slug a minúsculas", async () => {
    const d = deps();
    await editarWorkspace({ ...base, slug: "ACME" }, owner, d);
    expect(d.updateOrganization).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ slug: "acme" }),
    );
  });

  it("rechaza slug vacío", async () => {
    const d = deps();
    const r = await editarWorkspace({ ...base, slug: "   " }, owner, d);
    expect(r.ok).toBe(false);
    expect(d.updateOrganization).not.toHaveBeenCalled();
  });

  it("informa cuando el slug ya está en uso por otro workspace", async () => {
    const d: EditarWorkspaceDeps = { updateOrganization: vi.fn().mockRejectedValue(new SlugTakenError()) };
    const r = await editarWorkspace(base, owner, d);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/ya está en uso/);
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
      slug: "acme",
      careerSiteSettings: {},
      logoUrl: "org-1/logo.png",
    });
  });

  it("incluye la portada solo si vino un path nuevo", async () => {
    const d = deps();
    await editarWorkspace({ ...base, coverPath: "org-1/cover.png" }, owner, d);
    expect(d.updateOrganization).toHaveBeenCalledWith("org-1", {
      name: "Acme",
      slug: "acme",
      careerSiteSettings: {},
      careerSiteCoverUrl: "org-1/cover.png",
    });
  });
});
