import { describe, it, expect } from "vitest";
import { calcularProgresoSetup, type SetupCounts } from "./calcular-progreso-setup";

function makeCounts(over: Partial<SetupCounts> = {}): SetupCounts {
  return {
    careerSiteConfigured: false,
    stageTemplatesCount: 0,
    teamOrClientsCount: 0,
    jobsCount: 0,
    candidatesCount: 0,
    ...over,
  };
}

describe("calcularProgresoSetup", () => {
  it("0% cuando no se completó nada", () => {
    const res = calcularProgresoSetup(makeCounts(), "team");
    expect(res.done).toBe(0);
    expect(res.total).toBe(5);
    expect(res.percent).toBe(0);
  });

  it("100% cuando los 5 items están completos (team)", () => {
    const res = calcularProgresoSetup(
      makeCounts({
        careerSiteConfigured: true,
        stageTemplatesCount: 3,
        teamOrClientsCount: 2, // team: hace falta > 1
        jobsCount: 1,
        candidatesCount: 4,
      }),
      "team",
    );
    expect(res.done).toBe(5);
    expect(res.percent).toBe(100);
    expect(res.items.every((i) => i.done)).toBe(true);
  });

  it("team/enterprise: item de equipo pide más de 1 miembro (el owner solo no alcanza)", () => {
    const res = calcularProgresoSetup(makeCounts({ teamOrClientsCount: 1 }), "team");
    const item = res.items.find((i) => i.title === "Invitá a tu equipo");
    expect(item?.done).toBe(false);
  });

  it("freelance: muestra 'dar de alta cliente' en vez de 'invitá a tu equipo'", () => {
    const res = calcularProgresoSetup(makeCounts({ teamOrClientsCount: 1 }), "freelance");
    expect(res.items.some((i) => i.title === "Da de alta a tu primer cliente")).toBe(true);
    expect(res.items.some((i) => i.title === "Invitá a tu equipo")).toBe(false);
    const item = res.items.find((i) => i.title === "Da de alta a tu primer cliente");
    expect(item?.done).toBe(true); // freelance: alcanza con > 0
  });

  it("workspaceType null se trata como team/enterprise (orgs legacy)", () => {
    const res = calcularProgresoSetup(makeCounts(), null);
    expect(res.items.some((i) => i.title === "Invitá a tu equipo")).toBe(true);
  });

  it("'Creá tu primera búsqueda' es reactivo a jobsCount (antes quedaba fijo en false)", () => {
    const sinBusquedas = calcularProgresoSetup(makeCounts({ jobsCount: 0 }), "team");
    const conBusquedas = calcularProgresoSetup(makeCounts({ jobsCount: 1 }), "team");
    expect(sinBusquedas.items.find((i) => i.href === "/jobs/new")?.done).toBe(false);
    expect(conBusquedas.items.find((i) => i.href === "/jobs/new")?.done).toBe(true);
  });

  it("porcentaje parcial redondea", () => {
    // 2 de 5 = 40%
    const res = calcularProgresoSetup(
      makeCounts({ careerSiteConfigured: true, stageTemplatesCount: 1 }),
      "team",
    );
    expect(res.done).toBe(2);
    expect(res.percent).toBe(40);
  });
});
