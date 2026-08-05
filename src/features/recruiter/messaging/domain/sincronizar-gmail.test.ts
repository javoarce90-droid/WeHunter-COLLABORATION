import { describe, it, expect, vi } from "vitest";
import { sincronizarGmail } from "./sincronizar-gmail";
import type { SincronizarGmailDeps } from "./sincronizar-gmail";

const ctx = { organizationId: "org-1", role: "recruiter" as const };

const deps = (overrides: Partial<SincronizarGmailDeps> = {}): SincronizarGmailDeps => ({
  getCandidate: vi.fn().mockResolvedValue({ id: "cand-1", email: "juana@example.com" }),
  getConnection: vi.fn().mockResolvedValue({ id: "conn-1" }),
  fetchMessages: vi.fn().mockResolvedValue([
    { externalId: "msg-1", direction: "inbound", body: "Hola, ¿en qué etapa estoy?", sentAt: new Date("2026-07-01") },
  ]),
  ensureThread: vi.fn().mockResolvedValue({ threadId: "thread-1" }),
  recordSyncedMessages: vi.fn().mockResolvedValue(1),
  ...overrides,
});

describe("sincronizarGmail", () => {
  it("rechaza al viewer", async () => {
    const d = deps();
    const res = await sincronizarGmail("cand-1", { ...ctx, role: "viewer" }, d);
    expect(res.ok).toBe(false);
    expect(d.getCandidate).not.toHaveBeenCalled();
  });

  it("rechaza si el candidato no existe", async () => {
    const d = deps({ getCandidate: vi.fn().mockResolvedValue(null) });
    const res = await sincronizarGmail("cand-1", ctx, d);
    expect(res.ok).toBe(false);
    expect(d.getConnection).not.toHaveBeenCalled();
  });

  it("rechaza si el candidato no tiene email cargado", async () => {
    const d = deps({ getCandidate: vi.fn().mockResolvedValue({ id: "cand-1", email: null }) });
    const res = await sincronizarGmail("cand-1", ctx, d);
    expect(res.ok).toBe(false);
    expect(d.getConnection).not.toHaveBeenCalled();
  });

  it("rechaza si el recruiter no conectó su cuenta de Google", async () => {
    const d = deps({ getConnection: vi.fn().mockResolvedValue(null) });
    const res = await sincronizarGmail("cand-1", ctx, d);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toMatch(/conectá tu cuenta/i);
    expect(d.fetchMessages).not.toHaveBeenCalled();
  });

  it("propaga el error si falla la comunicación con Gmail", async () => {
    const d = deps({ fetchMessages: vi.fn().mockResolvedValue({ error: "token inválido" }) });
    const res = await sincronizarGmail("cand-1", ctx, d);
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error).toBe("token inválido");
    expect(d.ensureThread).not.toHaveBeenCalled();
  });

  it("busca por el email del candidato, asegura el hilo y guarda los mensajes", async () => {
    const d = deps();
    const res = await sincronizarGmail("cand-1", ctx, d);
    expect(res).toEqual({ ok: true, data: { synced: 1 } });
    expect(d.fetchMessages).toHaveBeenCalledWith("juana@example.com");
    expect(d.ensureThread).toHaveBeenCalledWith("cand-1");
    expect(d.recordSyncedMessages).toHaveBeenCalledWith("thread-1", expect.any(Array));
  });
});
