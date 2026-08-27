import { describe, it, expect, vi } from "vitest";
import {
  crearCandidatosDesdeCvs,
  type CrearCandidatosDesdeCvsDeps,
} from "./crear-candidatos-desde-cvs";

const draft = (over: Record<string, unknown> = {}) => ({
  fullName: "Ada Lovelace",
  email: "ada@acme.com",
  phone: null,
  headline: "Ingeniera",
  location: null,
  linkedinUrl: null,
  summary: "Resumen",
  skills: [],
  workExperiences: [],
  education: [],
  certifications: [],
  ...over,
});

const ctx = { organizationId: "org-1", role: "recruiter" as const };

const files = (...names: string[]) => names.map((fileName, i) => ({ id: String(i), fileName }));

function deps(over: Partial<CrearCandidatosDesdeCvsDeps> = {}): CrearCandidatosDesdeCvsDeps {
  return {
    extractCv: vi.fn(async () => ({ cv: { cvText: "un cv" }, cvUrl: null })),
    draftProfile: vi.fn(async () => draft()),
    cargarCandidato: vi.fn(async () => ({ ok: true as const, data: { candidateId: "c-1" } })),
    persistResume: vi.fn(async () => {}),
    concurrency: 2,
    ...over,
  };
}

describe("crearCandidatosDesdeCvs", () => {
  it("rechaza a un rol sin candidates.manage", async () => {
    const d = deps();
    const res = await crearCandidatosDesdeCvs(
      { files: files("a.pdf") },
      { ...ctx, role: "viewer" },
      d,
    );
    expect(res.ok).toBe(false);
    expect(d.extractCv).not.toHaveBeenCalled();
  });

  it("crea uno por CV y persiste el currículum", async () => {
    const d = deps({
      draftProfile: vi.fn(async () =>
        draft({ workExperiences: [{ company: "Acme", position: "Dev", startDate: null, endDate: null, description: null, employmentType: null, modality: null, skills: [] }] }),
      ),
    });
    const res = await crearCandidatosDesdeCvs({ files: files("a.pdf", "b.pdf") }, ctx, d);
    expect(res.ok && res.data).toEqual({ created: 2, skippedDuplicate: 0, failed: [] });
    expect(d.persistResume).toHaveBeenCalledTimes(2);
  });

  it("saltea y cuenta los duplicados, sin cortar el lote", async () => {
    let call = 0;
    const d = deps({
      cargarCandidato: vi.fn(async () => {
        call += 1;
        return call === 2
          ? { ok: false as const, error: "dup", duplicate: { id: "x", fullName: "Ada", matchedBy: "email" as const } }
          : { ok: true as const, data: { candidateId: `c-${call}` } };
      }),
    });
    const res = await crearCandidatosDesdeCvs(
      { files: files("a.pdf", "b.pdf", "c.pdf") },
      ctx,
      { ...d, concurrency: 1 },
    );
    expect(res.ok && res.data).toEqual({ created: 2, skippedDuplicate: 1, failed: [] });
  });

  it("un CV ilegible se reporta como fallido y no frena a los demás", async () => {
    const d = deps({
      // id "1" = "bad.pdf" según el orden de `files(...)`.
      extractCv: vi.fn(async (id: string) =>
        id === "1"
          ? { error: "No se pudo leer el .docx." }
          : { cv: { cvText: "ok" }, cvUrl: null },
      ),
    });
    const res = await crearCandidatosDesdeCvs(
      { files: files("ok.pdf", "bad.pdf") },
      ctx,
      { ...d, concurrency: 1 },
    );
    expect(res.ok && res.data.created).toBe(1);
    expect(res.ok && res.data.failed).toEqual([
      { fileName: "bad.pdf", reason: "No se pudo leer el .docx." },
    ]);
  });

  it("un CV sin email en el contenido se reporta como fallido", async () => {
    const d = deps({ draftProfile: vi.fn(async () => draft({ email: null })) });
    const res = await crearCandidatosDesdeCvs({ files: files("a.pdf") }, ctx, d);
    expect(res.ok && res.data.failed[0].reason).toBe("El CV no tiene un email de contacto.");
    expect(d.cargarCandidato).not.toHaveBeenCalled();
  });

  it("marca fallido si la IA cae al mock (extractionFailed)", async () => {
    const d = deps({ draftProfile: vi.fn(async () => draft({ extractionFailed: true })) });
    const res = await crearCandidatosDesdeCvs({ files: files("a.pdf") }, ctx, d);
    expect(res.ok && res.data.created).toBe(0);
    expect(res.ok && res.data.failed[0].reason).toBe("No se pudo extraer el perfil del CV.");
  });
});
