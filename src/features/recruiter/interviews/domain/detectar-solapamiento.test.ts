import { describe, it, expect } from "vitest";
import { encontrarSolapamientos, type SolapamientoCandidate } from "./detectar-solapamiento";

function iv(id: string, hhmm: string, status = "scheduled"): SolapamientoCandidate {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(2026, 7, 28, h, m);
  return { id, scheduledAt: d, candidateName: `Candidato ${id}`, status };
}

describe("encontrarSolapamientos", () => {
  it("detecta una entrevista que empieza a mitad de la ventana de otra (12:00 vs 12:30)", () => {
    const target = iv("a", "12:00");
    const others = [iv("b", "12:30")];
    expect(encontrarSolapamientos(target.scheduledAt, others).map((o) => o.id)).toEqual(["b"]);
  });

  it("no detecta conflicto si empiezan con más de 1h de diferencia", () => {
    const target = iv("a", "12:00");
    const others = [iv("b", "13:00")];
    expect(encontrarSolapamientos(target.scheduledAt, others)).toEqual([]);
  });

  it("ignora entrevistas canceladas", () => {
    const target = iv("a", "12:00");
    const others = [iv("b", "12:15", "cancelled")];
    expect(encontrarSolapamientos(target.scheduledAt, others)).toEqual([]);
  });

  it("excluye la propia entrevista al editar (excludeId)", () => {
    const target = iv("a", "12:00");
    const others = [iv("a", "12:00"), iv("b", "12:15")];
    const res = encontrarSolapamientos(target.scheduledAt, others, "a");
    expect(res.map((o) => o.id)).toEqual(["b"]);
  });

  it("detecta múltiples solapamientos", () => {
    const target = iv("a", "12:00");
    const others = [iv("b", "11:30"), iv("c", "12:45"), iv("d", "14:00")];
    expect(encontrarSolapamientos(target.scheduledAt, others).map((o) => o.id).sort()).toEqual([
      "b",
      "c",
    ]);
  });
});
