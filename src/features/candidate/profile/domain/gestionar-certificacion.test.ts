import { describe, it, expect, vi } from "vitest";
import {
  agregarCertificacion,
  eliminarCertificacion,
  normalizeCertificacion,
} from "./gestionar-certificacion";

const owner = { kind: "profile" as const, profileId: "candidate-1" };

describe("agregarCertificacion", () => {
  it("rechaza si falta el nombre", async () => {
    const deps = { insertCertification: vi.fn() };
    const res = await agregarCertificacion({ name: " " }, owner, deps);
    expect(res.ok).toBe(false);
    expect(deps.insertCertification).not.toHaveBeenCalled();
  });

  it("normaliza y persiste un certificado válido", async () => {
    const deps = { insertCertification: vi.fn().mockResolvedValue({ id: "cert-1" }) };
    const res = await agregarCertificacion({ name: " AWS Certified " }, owner, deps);
    expect(res).toEqual({ ok: true, data: { id: "cert-1" } });
    expect(deps.insertCertification).toHaveBeenCalledWith(
      owner,
      expect.objectContaining({ name: "AWS Certified", url: null }),
    );
  });
});

describe("eliminarCertificacion", () => {
  it("devuelve error si no se encontró/no pertenece", async () => {
    const deps = { deleteCertification: vi.fn().mockResolvedValue(false) };
    const res = await eliminarCertificacion("cert-1", owner, deps);
    expect(res.ok).toBe(false);
  });

  it("elimina cuando existe y pertenece", async () => {
    const deps = { deleteCertification: vi.fn().mockResolvedValue(true) };
    const res = await eliminarCertificacion("cert-1", owner, deps);
    expect(res).toEqual({ ok: true, data: { id: "cert-1" } });
  });
});

describe("normalizeCertificacion (reusada por el onboarding con IA)", () => {
  it("está exportada y valida igual que antes", () => {
    const res = normalizeCertificacion({ name: " AWS Certified " });
    expect(res).toEqual({ ok: true, data: { name: "AWS Certified", url: null } });
  });

  it("rechaza sin nombre", () => {
    expect(normalizeCertificacion({ name: " " }).ok).toBe(false);
  });
});
