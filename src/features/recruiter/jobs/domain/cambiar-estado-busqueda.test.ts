import { describe, it, expect, vi } from "vitest";
import {
  cambiarEstadoBusqueda,
  isValidTransition,
  type CambiarEstadoDeps,
  type JobStatus,
} from "./cambiar-estado-busqueda";

function deps(actual: JobStatus | null): CambiarEstadoDeps {
  return {
    getJobStatus: vi.fn(async () => actual),
    updateJobStatus: vi.fn(async () => {}),
  };
}
const ctx = { organizationId: "org-1", role: "recruiter" as const, membershipId: "m1" };

describe("isValidTransition", () => {
  it("permite las transiciones del flujo", () => {
    expect(isValidTransition("draft", "open")).toBe(true);
    expect(isValidTransition("open", "paused")).toBe(true);
    expect(isValidTransition("paused", "open")).toBe(true);
    expect(isValidTransition("open", "closed")).toBe(true);
  });
  it("rechaza transiciones inválidas y desde closed (terminal)", () => {
    expect(isValidTransition("draft", "closed")).toBe(false);
    expect(isValidTransition("draft", "paused")).toBe(false);
    expect(isValidTransition("closed", "open")).toBe(false);
  });
  it("permite archivar desde cualquier estado no terminal", () => {
    expect(isValidTransition("draft", "archived")).toBe(true);
    expect(isValidTransition("open", "archived")).toBe(true);
    expect(isValidTransition("paused", "archived")).toBe(true);
    expect(isValidTransition("closed", "archived")).toBe(true);
  });
  it("rechaza cualquier transición desde archived (terminal, sin desarchivar)", () => {
    expect(isValidTransition("archived", "draft")).toBe(false);
    expect(isValidTransition("archived", "open")).toBe(false);
  });
});

describe("cambiarEstadoBusqueda", () => {
  it("rechaza al consultor", async () => {
    const d = deps("draft");
    const res = await cambiarEstadoBusqueda(
      { jobId: "j1", nuevoEstado: "open" },
      { ...ctx, role: "consultant" },
      d,
    );
    expect(res.ok).toBe(false);
    expect(d.updateJobStatus).not.toHaveBeenCalled();
  });

  it("falla si la búsqueda no existe", async () => {
    const d = deps(null);
    const res = await cambiarEstadoBusqueda({ jobId: "j1", nuevoEstado: "open" }, ctx, d);
    expect(res.ok).toBe(false);
  });

  it("rechaza transición inválida", async () => {
    const d = deps("draft");
    const res = await cambiarEstadoBusqueda({ jobId: "j1", nuevoEstado: "closed" }, ctx, d);
    expect(res.ok).toBe(false);
    expect(d.updateJobStatus).not.toHaveBeenCalled();
  });

  it("publica una búsqueda (draft → open)", async () => {
    const d = deps("draft");
    const res = await cambiarEstadoBusqueda({ jobId: "j1", nuevoEstado: "open" }, ctx, d);
    expect(res).toEqual({ ok: true, data: { jobId: "j1", estado: "open" } });
    expect(d.updateJobStatus).toHaveBeenCalledWith("j1", "org-1", "open");
    // Recruiter queda acotado a lo asignado: se lo pasa a getJobStatus para que filtre.
    expect(d.getJobStatus).toHaveBeenCalledWith("j1", "org-1", "m1");
  });

  it("owner/admin no quedan acotados a una búsqueda asignada (sin scope)", async () => {
    const d = deps("draft");
    await cambiarEstadoBusqueda(
      { jobId: "j1", nuevoEstado: "open" },
      { ...ctx, role: "owner" },
      d,
    );
    expect(d.getJobStatus).toHaveBeenCalledWith("j1", "org-1", undefined);
  });

  it("es idempotente si ya está en ese estado (no escribe)", async () => {
    const d = deps("open");
    const res = await cambiarEstadoBusqueda({ jobId: "j1", nuevoEstado: "open" }, ctx, d);
    expect(res.ok).toBe(true);
    expect(d.updateJobStatus).not.toHaveBeenCalled();
  });

  it("archiva una búsqueda abierta", async () => {
    const d = deps("open");
    const res = await cambiarEstadoBusqueda({ jobId: "j1", nuevoEstado: "archived" }, ctx, d);
    expect(res).toEqual({ ok: true, data: { jobId: "j1", estado: "archived" } });
    expect(d.updateJobStatus).toHaveBeenCalledWith("j1", "org-1", "archived");
  });

  it("rechaza cualquier transición desde una búsqueda archivada", async () => {
    const d = deps("archived");
    const res = await cambiarEstadoBusqueda({ jobId: "j1", nuevoEstado: "open" }, ctx, d);
    expect(res.ok).toBe(false);
    expect(d.updateJobStatus).not.toHaveBeenCalled();
  });
});
