import { describe, it, expect, vi } from "vitest";
import {
  ignorarCandidatoParaBusqueda,
  type IgnorarCandidatoPoolCtx,
  type IgnorarCandidatoPoolDeps,
} from "./ignorar-candidato-pool";

const ctx = (over: Partial<IgnorarCandidatoPoolCtx> = {}): IgnorarCandidatoPoolCtx => ({
  role: "recruiter",
  organizationId: "org-1",
  userId: "user-1",
  ...over,
});

const deps = (over: Partial<IgnorarCandidatoPoolDeps> = {}): IgnorarCandidatoPoolDeps => ({
  jobExists: vi.fn(async () => true),
  ignore: vi.fn(async () => {}),
  unignore: vi.fn(async () => {}),
  ...over,
});

const input = { jobId: "job-1", candidateId: "cand-1", ignorar: true };

describe("ignorarCandidatoParaBusqueda", () => {
  it("ignora: llama a ignore con el userId y devuelve ignorado:true", async () => {
    const d = deps();
    const res = await ignorarCandidatoParaBusqueda(input, ctx(), d);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.ignorado).toBe(true);
    expect(d.ignore).toHaveBeenCalledWith("job-1", "cand-1", "user-1");
    expect(d.unignore).not.toHaveBeenCalled();
  });

  it("deshacer: llama a unignore y devuelve ignorado:false", async () => {
    const d = deps();
    const res = await ignorarCandidatoParaBusqueda({ ...input, ignorar: false }, ctx(), d);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.ignorado).toBe(false);
    expect(d.unignore).toHaveBeenCalledWith("job-1", "cand-1");
    expect(d.ignore).not.toHaveBeenCalled();
  });

  it("rechaza al viewer sin tocar la base", async () => {
    const d = deps();
    const res = await ignorarCandidatoParaBusqueda(input, ctx({ role: "viewer" }), d);
    expect(res.ok).toBe(false);
    expect(d.ignore).not.toHaveBeenCalled();
  });

  it("rechaza si no hay workspace activo", async () => {
    const res = await ignorarCandidatoParaBusqueda(input, ctx({ organizationId: null }), deps());
    expect(res.ok).toBe(false);
  });

  it("falla si la búsqueda no existe", async () => {
    const d = deps({ jobExists: vi.fn(async () => false) });
    const res = await ignorarCandidatoParaBusqueda(input, ctx(), d);
    expect(res.ok).toBe(false);
    expect(d.ignore).not.toHaveBeenCalled();
  });

  it("permite ignorar sin userId (queda ignored_by null)", async () => {
    const d = deps();
    await ignorarCandidatoParaBusqueda(input, ctx({ userId: null }), d);
    expect(d.ignore).toHaveBeenCalledWith("job-1", "cand-1", null);
  });
});
