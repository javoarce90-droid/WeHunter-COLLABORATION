import { describe, it, expect, vi } from "vitest";
import { postearComentario } from "./postear-comentario";
import type { PostearComentarioCtx, PostearComentarioDeps } from "./postear-comentario";

const makeDeps = (overrides?: Partial<PostearComentarioDeps>): PostearComentarioDeps => ({
  getShortlistCandidateById: vi.fn().mockResolvedValue({ id: "sc-1" }),
  createComment: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const ctx: PostearComentarioCtx = {
  organizationId: "org-1",
  role: "recruiter",
  membershipId: "mem-recruiter",
};

const input = { shortlistCandidateId: "sc-1", body: "Confirmamos disponibilidad para el jueves." };

describe("postearComentario", () => {
  it("postea el comentario cuando el candidato pertenece a la org", async () => {
    const deps = makeDeps();
    const result = await postearComentario(input, ctx, deps);
    expect(result.ok).toBe(true);
    expect(deps.createComment).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        shortlistCandidateId: "sc-1",
        authorMembershipId: "mem-recruiter",
        body: input.body,
      }),
    );
  });

  it("recorta espacios del cuerpo", async () => {
    const deps = makeDeps();
    await postearComentario({ ...input, body: "  hola  " }, ctx, deps);
    expect(deps.createComment).toHaveBeenCalledWith(expect.objectContaining({ body: "hola" }));
  });

  it("rechaza comentario vacío", async () => {
    const deps = makeDeps();
    const result = await postearComentario({ ...input, body: "   " }, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/vacío/i);
    expect(deps.createComment).not.toHaveBeenCalled();
  });

  it("rechaza comentario demasiado largo", async () => {
    const deps = makeDeps();
    const result = await postearComentario({ ...input, body: "x".repeat(2001) }, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/2\.000/);
    expect(deps.createComment).not.toHaveBeenCalled();
  });

  it("rechaza un candidato ajeno a la org", async () => {
    const deps = makeDeps({ getShortlistCandidateById: vi.fn().mockResolvedValue(null) });
    const result = await postearComentario(input, ctx, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no encontrado/i);
    expect(deps.createComment).not.toHaveBeenCalled();
  });

  it("rechaza roles sin shortlists.manage (ej. hiring_manager)", async () => {
    const deps = makeDeps();
    const result = await postearComentario(input, { ...ctx, role: "hiring_manager" }, deps);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no permite/i);
    expect(deps.createComment).not.toHaveBeenCalled();
  });
});
