import { describe, it, expect, vi } from "vitest";
import {
  enviarEmailACliente,
  type EnviarEmailAClienteDeps,
  type ClientForEmail,
} from "./enviar-email-a-cliente";

const CLIENT: ClientForEmail = {
  id: "client-1",
  name: "Acme Corp",
  contactName: "Ana",
  contactEmail: "ana@acme.com",
};

const deps = (over: Partial<EnviarEmailAClienteDeps> & { client?: ClientForEmail | null } = {}): EnviarEmailAClienteDeps => ({
  getClient: vi.fn(async () => (over.client === undefined ? CLIENT : over.client)),
  sendEmail: over.sendEmail ?? vi.fn(async () => ({ ok: true as const, externalId: "gmail-99" })),
  recordSent: over.recordSent ?? vi.fn(async () => {}),
});

const ctx = { organizationId: "org-1", role: "recruiter" as const, userId: "u1" };
const input = { clientId: "client-1", subject: "Hola", body: "Novedades del proceso." };

describe("enviarEmailACliente", () => {
  it("rechaza a un rol sin clients.manage y no envía", async () => {
    const d = deps();
    const res = await enviarEmailACliente(input, { ...ctx, role: "sourcer" }, d);
    expect(res.ok).toBe(false);
    expect(d.sendEmail).not.toHaveBeenCalled();
  });

  it("rechaza asunto vacío", async () => {
    const d = deps();
    const res = await enviarEmailACliente({ ...input, subject: "   " }, ctx, d);
    expect(res.ok).toBe(false);
    expect(d.sendEmail).not.toHaveBeenCalled();
  });

  it("rechaza mensaje vacío", async () => {
    const d = deps();
    const res = await enviarEmailACliente({ ...input, body: "  " }, ctx, d);
    expect(res.ok).toBe(false);
    expect(d.sendEmail).not.toHaveBeenCalled();
  });

  it("rechaza si el cliente no existe", async () => {
    const d = deps({ client: null });
    const res = await enviarEmailACliente(input, ctx, d);
    expect(res.ok).toBe(false);
    expect(d.sendEmail).not.toHaveBeenCalled();
  });

  it("rechaza si el cliente no tiene email de contacto", async () => {
    const d = deps({ client: { ...CLIENT, contactEmail: null } });
    const res = await enviarEmailACliente(input, ctx, d);
    expect(res).toEqual({
      ok: false,
      error: "El cliente no tiene un email de contacto. Cargalo en Editar.",
    });
    expect(d.sendEmail).not.toHaveBeenCalled();
  });

  it("si el envío falla, devuelve el error y NO registra", async () => {
    const recordSent = vi.fn(async () => {});
    const d = deps({
      sendEmail: vi.fn(async () => ({ ok: false as const, error: "Gmail cayó" })),
      recordSent,
    });
    const res = await enviarEmailACliente(input, ctx, d);
    expect(res).toEqual({ ok: false, error: "Gmail cayó" });
    expect(recordSent).not.toHaveBeenCalled();
  });

  it("envía al contacto y registra con el externalId real", async () => {
    const sendEmail = vi.fn(async () => ({ ok: true as const, externalId: "gmail-99" }));
    const recordSent = vi.fn(async () => {});
    const d = deps({ sendEmail, recordSent });
    const res = await enviarEmailACliente(
      { clientId: "client-1", subject: "  Hola  ", body: "  Novedades.  " },
      ctx,
      d,
    );
    expect(res).toEqual({ ok: true });
    expect(sendEmail).toHaveBeenCalledWith("ana@acme.com", "Hola", "Novedades.");
    expect(recordSent).toHaveBeenCalledWith({
      clientId: "client-1",
      toEmail: "ana@acme.com",
      subject: "Hola",
      body: "Novedades.",
      externalId: "gmail-99",
    });
  });
});
