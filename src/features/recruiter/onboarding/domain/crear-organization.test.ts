import { describe, it, expect, vi } from "vitest";
import {
  crearOrganization,
  slugify,
  type CrearOrganizationDeps,
} from "./crear-organization";

function makeDeps(organizationId = "org-1"): CrearOrganizationDeps {
  return {
    createOrganizationWithOwner: vi.fn(async () => ({ organizationId })),
  };
}

describe("slugify", () => {
  it("normaliza nombre con acentos y espacios", () => {
    expect(slugify("Consultora Ñandú RH")).toBe("consultora-nandu-rh");
  });
  it("colapsa separadores y recorta guiones", () => {
    expect(slugify("  Hola___Mundo!!  ")).toBe("hola-mundo");
  });
});

describe("crearOrganization", () => {
  it("rechaza si no hay usuario autenticado", async () => {
    const deps = makeDeps();
    const res = await crearOrganization({ name: "Acme", workspaceType: "team" }, { userId: null }, deps);

    expect(res.ok).toBe(false);
    expect(deps.createOrganizationWithOwner).not.toHaveBeenCalled();
  });

  it("rechaza nombre demasiado corto", async () => {
    const deps = makeDeps();
    const res = await crearOrganization({ name: "A", workspaceType: "team" }, { userId: "u1" }, deps);

    expect(res.ok).toBe(false);
    expect(deps.createOrganizationWithOwner).not.toHaveBeenCalled();
  });

  it("rechaza nombre sin caracteres alfanuméricos", async () => {
    const deps = makeDeps();
    const res = await crearOrganization({ name: "!!!", workspaceType: "team" }, { userId: "u1" }, deps);

    expect(res.ok).toBe(false);
  });

  it("crea la organization con el usuario como owner y devuelve su id", async () => {
    const deps = makeDeps("org-42");
    const res = await crearOrganization(
      { name: "  Talento Global  ", workspaceType: "team" },
      { userId: "user-7" },
      deps,
    );

    expect(res).toEqual({ ok: true, data: { organizationId: "org-42" } });
    expect(deps.createOrganizationWithOwner).toHaveBeenCalledWith({
      name: "Talento Global",
      slug: "talento-global",
      ownerId: "user-7",
      workspaceType: "team",
    });
  });

  it("propaga el tipo de workspace elegido", async () => {
    const deps = makeDeps("org-9");
    await crearOrganization(
      { name: "Freelo", workspaceType: "enterprise" },
      { userId: "user-7" },
      deps,
    );

    expect(deps.createOrganizationWithOwner).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceType: "enterprise" }),
    );
  });
});
