import { describe, it, expect } from "vitest";
import { calcularProgresoSetup, type SetupCounts } from "./calcular-progreso-setup";

function makeCounts(over: Partial<SetupCounts> = {}): SetupCounts {
  return {
    careerSiteConfigured: false,
    clientsOrHmCount: 0,
    jobsCount: 0,
    candidatesCount: 0,
    googleCalendarConnected: false,
    teamCount: 0,
    ...over,
  };
}

describe("calcularProgresoSetup", () => {
  it("freelance: 5 items, en el orden del spec, sin 'Invitá a tu equipo'", () => {
    const res = calcularProgresoSetup(makeCounts(), "freelance");
    expect(res.total).toBe(5);
    expect(res.items.map((i) => i.title)).toEqual([
      "Configurá tu career site",
      "Da de alta a tu primer cliente",
      "Creá tu primera búsqueda",
      "Cargá tus primeros candidatos",
      "Conectá tu agenda",
    ]);
  });

  it("team: 6 items, 'Da de alta a tu primer cliente' + 'Invitá a tu equipo' al final", () => {
    const res = calcularProgresoSetup(makeCounts(), "team");
    expect(res.total).toBe(6);
    expect(res.items.map((i) => i.title)).toEqual([
      "Configurá tu career site",
      "Da de alta a tu primer cliente",
      "Creá tu primera búsqueda",
      "Cargá tus primeros candidatos",
      "Conectá tu agenda",
      "Invitá a tu equipo",
    ]);
  });

  it("enterprise: 6 items, 'Invitá a tu primer Hiring Manager' en vez de cliente", () => {
    const res = calcularProgresoSetup(makeCounts(), "enterprise");
    expect(res.total).toBe(6);
    expect(res.items.map((i) => i.title)).toEqual([
      "Configurá tu career site",
      "Invitá a tu primer Hiring Manager",
      "Creá tu primera búsqueda",
      "Cargá tus primeros candidatos",
      "Conectá tu agenda",
      "Invitá a tu equipo",
    ]);
  });

  it("workspaceType null se trata como team/enterprise (orgs legacy): 6 items, cliente no HM", () => {
    const res = calcularProgresoSetup(makeCounts(), null);
    expect(res.total).toBe(6);
    expect(res.items.some((i) => i.title === "Da de alta a tu primer cliente")).toBe(true);
    expect(res.items.some((i) => i.title === "Invitá a tu equipo")).toBe(true);
  });

  it("'Da de alta a tu primer cliente'/'Hiring Manager' usan el mismo count (clientsOrHmCount)", () => {
    const freelance = calcularProgresoSetup(makeCounts({ clientsOrHmCount: 1 }), "freelance");
    const enterprise = calcularProgresoSetup(makeCounts({ clientsOrHmCount: 1 }), "enterprise");
    expect(freelance.items.find((i) => i.href === "/clients/new")?.done).toBe(true);
    expect(enterprise.items.find((i) => i.href === "/clients/new")?.done).toBe(true);
  });

  it("'Invitá a tu equipo' pide más de 1 miembro (el owner solo no alcanza)", () => {
    const uno = calcularProgresoSetup(makeCounts({ teamCount: 1 }), "team");
    const dos = calcularProgresoSetup(makeCounts({ teamCount: 2 }), "team");
    expect(uno.items.find((i) => i.title === "Invitá a tu equipo")?.done).toBe(false);
    expect(dos.items.find((i) => i.title === "Invitá a tu equipo")?.done).toBe(true);
  });

  it("'Conectá tu agenda' es reactivo a googleCalendarConnected", () => {
    const sinConectar = calcularProgresoSetup(makeCounts(), "freelance");
    const conectada = calcularProgresoSetup(
      makeCounts({ googleCalendarConnected: true }),
      "freelance",
    );
    expect(sinConectar.items.find((i) => i.title === "Conectá tu agenda")?.done).toBe(false);
    expect(conectada.items.find((i) => i.title === "Conectá tu agenda")?.done).toBe(true);
  });

  it("100% cuando todos los items de freelance están completos", () => {
    const res = calcularProgresoSetup(
      makeCounts({
        careerSiteConfigured: true,
        clientsOrHmCount: 1,
        jobsCount: 1,
        candidatesCount: 1,
        googleCalendarConnected: true,
      }),
      "freelance",
    );
    expect(res.done).toBe(5);
    expect(res.percent).toBe(100);
  });

  it("porcentaje parcial redondea (2 de 6 = 33%)", () => {
    const res = calcularProgresoSetup(
      makeCounts({ careerSiteConfigured: true, clientsOrHmCount: 1 }),
      "team",
    );
    expect(res.done).toBe(2);
    expect(res.percent).toBe(33);
  });
});
