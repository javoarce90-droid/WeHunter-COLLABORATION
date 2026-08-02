import { describe, it, expect } from "vitest";
import { buildJobStagesFromTemplate } from "./schema";
import type { StageKind } from "./schema";

const item = (name: string, position: number, kind: StageKind, slaDays: number | null = null) => ({
  name,
  position,
  slaDays,
  kind,
});

describe("buildJobStagesFromTemplate", () => {
  it("asigna legacyStage fijo a inbox/offer/hired/rejected", () => {
    const template = [
      item("Postulados", 0, "inbox"),
      item("Preseleccionado", 1, "in_process", 3),
      item("Oferta", 2, "offer"),
      item("Contratado", 3, "hired"),
      item("Descartado", 4, "rejected"),
    ];
    const result = buildJobStagesFromTemplate(template);

    expect(result.find((s) => s.kind === "inbox")?.legacyStage).toBe("new");
    expect(result.find((s) => s.kind === "offer")?.legacyStage).toBe("offer");
    expect(result.find((s) => s.kind === "hired")?.legacyStage).toBe("hired");
    expect(result.find((s) => s.kind === "rejected")?.legacyStage).toBe("rejected");
  });

  it("asigna 'screening' solo a la primera etapa in_process, el resto queda null", () => {
    const template = [
      item("Postulados", 0, "inbox"),
      item("Preseleccionado", 1, "in_process"),
      item("Entrevista Recruiter", 2, "in_process"),
      item("Entrevista Cliente", 3, "in_process"),
      item("Oferta", 4, "offer"),
      item("Contratado", 5, "hired"),
      item("Descartado", 6, "rejected"),
    ];
    const result = buildJobStagesFromTemplate(template);
    const enProceso = result.filter((s) => s.kind === "in_process");

    expect(enProceso[0].legacyStage).toBe("screening");
    expect(enProceso[1].legacyStage).toBeNull();
    expect(enProceso[2].legacyStage).toBeNull();
  });

  it("preserva nombre, position y slaDays de cada etapa", () => {
    const template = [item("Postulados", 0, "inbox"), item("Preseleccionado", 1, "in_process", 3)];
    const result = buildJobStagesFromTemplate(template);

    expect(result[1]).toMatchObject({ name: "Preseleccionado", position: 1, slaDays: 3 });
  });

  it("respeta el orden por position, no el orden de llegada del array", () => {
    const template = [
      item("Preseleccionado", 1, "in_process"),
      item("Postulados", 0, "inbox"),
    ];
    const result = buildJobStagesFromTemplate(template);

    expect(result[0].name).toBe("Postulados");
    expect(result[1].name).toBe("Preseleccionado");
  });
});
