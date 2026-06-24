import { describe, it, expect, vi } from "vitest";
import { agregarNota, type AgregarNotaDeps } from "./agregar-nota";

const deps = (app: { id: string } | null = { id: "app-1" }): AgregarNotaDeps => ({
  getApplicationById: vi.fn(async () => app),
  insertNote: vi.fn(async () => ({ noteId: "note-1" })),
});
const ctx = { userId: "u1", organizationId: "org-1", role: "recruiter" as const };

describe("agregarNota", () => {
  it("rechaza sin sesión/organization", async () => {
    const d = deps();
    const res = await agregarNota(
      { applicationId: "app-1", body: "hola" },
      { userId: null, organizationId: null, role: null },
      d,
    );
    expect(res.ok).toBe(false);
    expect(d.insertNote).not.toHaveBeenCalled();
  });

  it("rechaza al consultor", async () => {
    const d = deps();
    const res = await agregarNota(
      { applicationId: "app-1", body: "hola" },
      { ...ctx, role: "consultant" },
      d,
    );
    expect(res.ok).toBe(false);
    expect(d.insertNote).not.toHaveBeenCalled();
  });

  it("rechaza nota vacía", async () => {
    const d = deps();
    const res = await agregarNota({ applicationId: "app-1", body: "   " }, ctx, d);
    expect(res.ok).toBe(false);
    expect(d.insertNote).not.toHaveBeenCalled();
  });

  it("error si la postulación no existe", async () => {
    const d = deps(null);
    const res = await agregarNota({ applicationId: "app-x", body: "hola" }, ctx, d);
    expect(res.ok).toBe(false);
    expect(d.insertNote).not.toHaveBeenCalled();
  });

  it("inserta la nota normalizando el cuerpo", async () => {
    const d = deps();
    const res = await agregarNota({ applicationId: "app-1", body: "  buen perfil  " }, ctx, d);
    expect(res).toEqual({ ok: true, data: { noteId: "note-1" } });
    expect(d.insertNote).toHaveBeenCalledWith({
      organizationId: "org-1",
      applicationId: "app-1",
      body: "buen perfil",
      createdBy: "u1",
    });
  });
});
