import { describe, it, expect } from "vitest";
import { cambiarWorkspaceActivo } from "./cambiar-workspace-activo";

const memberships = [{ organizationId: "org-1" }, { organizationId: "org-2" }];

describe("cambiarWorkspaceActivo", () => {
  it("permite cambiar a un workspace propio", () => {
    const r = cambiarWorkspaceActivo({ organizationId: "org-2" }, { memberships });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.organizationId).toBe("org-2");
  });

  it("rechaza un workspace ajeno", () => {
    const r = cambiarWorkspaceActivo({ organizationId: "org-ajeno" }, { memberships });
    expect(r.ok).toBe(false);
  });
});
