import { describe, it, expect, vi } from "vitest";
import {
  importarCandidatosMasivo,
  type ColumnMapping,
  type ImportarCandidatosMasivoDeps,
} from "./importar-candidatos-masivo";

const ctx = { organizationId: "org-1", role: "recruiter" as const };

const mapping: ColumnMapping = {
  fullName: "Nombre",
  email: "Email",
  phone: "Teléfono",
};

function makeDeps(over?: Partial<ImportarCandidatosMasivoDeps>): ImportarCandidatosMasivoDeps {
  return {
    findExistingEmails: vi.fn().mockResolvedValue(new Set<string>()),
    insertCandidatesBatch: vi.fn().mockImplementation(async (_org, rows) => ({ inserted: rows.length })),
    ...over,
  };
}

describe("importarCandidatosMasivo", () => {
  it("rechaza sin autenticación", async () => {
    const res = await importarCandidatosMasivo(
      { rows: [], mapping },
      { organizationId: null, role: null },
      makeDeps(),
    );
    expect(res.ok).toBe(false);
  });

  it("rechaza sin permiso de candidates.manage", async () => {
    const res = await importarCandidatosMasivo(
      { rows: [{ Nombre: "Ana", Email: "ana@test.com" }], mapping },
      { organizationId: "org-1", role: "viewer" },
      makeDeps(),
    );
    expect(res.ok).toBe(false);
  });

  it("rechaza si falta el mapeo de nombre o email", async () => {
    const res = await importarCandidatosMasivo(
      { rows: [{ Nombre: "Ana", Email: "ana@test.com" }], mapping: { fullName: "", email: "" } },
      ctx,
      makeDeps(),
    );
    expect(res.ok).toBe(false);
  });

  it("rechaza un archivo vacío", async () => {
    const res = await importarCandidatosMasivo({ rows: [], mapping }, ctx, makeDeps());
    expect(res.ok).toBe(false);
  });

  it("rechaza si supera el máximo de filas", async () => {
    const rows = Array.from({ length: 1001 }, (_, i) => ({
      Nombre: `Candidato ${i}`,
      Email: `c${i}@test.com`,
    }));
    const res = await importarCandidatosMasivo({ rows, mapping }, ctx, makeDeps());
    expect(res.ok).toBe(false);
  });

  it("importa las filas válidas y devuelve el resumen", async () => {
    const insertCandidatesBatch = vi.fn().mockResolvedValue({ inserted: 2 });
    const deps = makeDeps({ insertCandidatesBatch });
    const res = await importarCandidatosMasivo(
      {
        rows: [
          { Nombre: "Ana Pérez", Email: "ana@test.com", Teléfono: "+54 9 11 1111-1111" },
          { Nombre: "Bruno Díaz", Email: "bruno@test.com", Teléfono: "" },
        ],
        mapping,
      },
      ctx,
      deps,
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.imported).toBe(2);
    expect(res.data.skipped).toBe(0);
    expect(insertCandidatesBatch).toHaveBeenCalledWith(
      "org-1",
      expect.arrayContaining([
        expect.objectContaining({ fullName: "Ana Pérez", email: "ana@test.com" }),
        expect.objectContaining({ fullName: "Bruno Díaz", email: "bruno@test.com" }),
      ]),
    );
  });

  it("marca fila sin nombre como error, sin bloquear el resto", async () => {
    const insertCandidatesBatch = vi.fn().mockResolvedValue({ inserted: 1 });
    const res = await importarCandidatosMasivo(
      {
        rows: [
          { Nombre: "", Email: "sinnombre@test.com" },
          { Nombre: "Ana Pérez", Email: "ana@test.com" },
        ],
        mapping,
      },
      ctx,
      makeDeps({ insertCandidatesBatch }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.imported).toBe(1);
    expect(res.data.skipped).toBe(1);
    expect(res.data.errors[0]).toMatchObject({ row: 2, error: "Falta el nombre." });
  });

  it("marca email inválido como error", async () => {
    const res = await importarCandidatosMasivo(
      { rows: [{ Nombre: "Ana Pérez", Email: "no-es-un-email" }], mapping },
      ctx,
      makeDeps(),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.imported).toBe(0);
    expect(res.data.errors[0]?.error).toBe("Email inválido o vacío.");
  });

  it("detecta emails duplicados dentro del mismo archivo", async () => {
    const res = await importarCandidatosMasivo(
      {
        rows: [
          { Nombre: "Ana Pérez", Email: "ana@test.com" },
          { Nombre: "Ana P.", Email: "ANA@test.com" },
        ],
        mapping,
      },
      ctx,
      makeDeps(),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.imported).toBe(1);
    expect(res.data.errors[0]).toMatchObject({ row: 3, error: "Email duplicado dentro del archivo." });
  });

  it("detecta candidatos que ya existen en el pool de la organización", async () => {
    const findExistingEmails = vi.fn().mockResolvedValue(new Set(["ana@test.com"]));
    const insertCandidatesBatch = vi.fn().mockResolvedValue({ inserted: 0 });
    const res = await importarCandidatosMasivo(
      { rows: [{ Nombre: "Ana Pérez", Email: "ana@test.com" }], mapping },
      ctx,
      makeDeps({ findExistingEmails, insertCandidatesBatch }),
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.imported).toBe(0);
    expect(res.data.errors[0]?.error).toBe("Ya existe un candidato con ese email en tu pool.");
    expect(insertCandidatesBatch).not.toHaveBeenCalled();
  });

  it("no llama a insertCandidatesBatch si no hay filas válidas", async () => {
    const insertCandidatesBatch = vi.fn();
    await importarCandidatosMasivo(
      { rows: [{ Nombre: "", Email: "" }], mapping },
      ctx,
      makeDeps({ insertCandidatesBatch }),
    );
    expect(insertCandidatesBatch).not.toHaveBeenCalled();
  });
});
