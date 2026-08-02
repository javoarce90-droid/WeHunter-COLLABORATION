import { describe, it, expect, vi } from "vitest";
import { editarCareerSite } from "./editar-career-site";
import type { CareerSiteContext, EditarCareerSiteDeps } from "./editar-career-site";
import { SlugTakenError } from "@/features/recruiter/settings/data/settings.mutations";

const owner: CareerSiteContext = { organizationId: "org-1", role: "owner" };
const deps = (): EditarCareerSiteDeps => ({ updateOrganization: vi.fn().mockResolvedValue(undefined) });
const base = { slug: "acme", branding: {} };

describe("editarCareerSite", () => {
  it("el owner edita el slug y el branding del Career Site", async () => {
    const d = deps();
    const r = await editarCareerSite(
      { ...base, branding: { description: "Somos una consultora", primaryColor: "#6D28D9" } },
      owner,
      d,
    );
    expect(r.ok).toBe(true);
    expect(d.updateOrganization).toHaveBeenCalledWith("org-1", {
      slug: "acme",
      careerSiteSettings: { description: "Somos una consultora", primaryColor: "#6D28D9" },
    });
  });

  it("normaliza el slug a minúsculas", async () => {
    const d = deps();
    await editarCareerSite({ ...base, slug: "ACME" }, owner, d);
    expect(d.updateOrganization).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ slug: "acme" }),
    );
  });

  it("rechaza slug vacío", async () => {
    const d = deps();
    const r = await editarCareerSite({ ...base, slug: "   " }, owner, d);
    expect(r.ok).toBe(false);
    expect(d.updateOrganization).not.toHaveBeenCalled();
  });

  it("informa cuando el slug ya está en uso por otro workspace", async () => {
    const d: EditarCareerSiteDeps = { updateOrganization: vi.fn().mockRejectedValue(new SlugTakenError()) };
    const r = await editarCareerSite(base, owner, d);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/ya está en uso/);
  });

  it("un admin también puede editar", async () => {
    const d = deps();
    const r = await editarCareerSite(base, { ...owner, role: "admin" }, d);
    expect(r.ok).toBe(true);
  });

  it("un recruiter no puede editar el Career Site", async () => {
    const d = deps();
    const r = await editarCareerSite(base, { ...owner, role: "recruiter" }, d);
    expect(r.ok).toBe(false);
    expect(d.updateOrganization).not.toHaveBeenCalled();
  });

  it("incluye la portada solo si vino un path nuevo", async () => {
    const d = deps();
    await editarCareerSite({ ...base, coverPath: "org-1/cover.png" }, owner, d);
    expect(d.updateOrganization).toHaveBeenCalledWith("org-1", {
      slug: "acme",
      careerSiteSettings: {},
      careerSiteCoverUrl: "org-1/cover.png",
    });
  });
});
