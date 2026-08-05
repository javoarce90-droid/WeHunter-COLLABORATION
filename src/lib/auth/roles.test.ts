import { describe, it, expect } from "vitest";
import {
  can,
  canManageRecruiting,
  isReadOnly,
  isAssignmentScoped,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
} from "./roles";
import type { Capability } from "./roles";
import type { OrgRole } from "./session";

const TODOS: OrgRole[] = [
  "owner",
  "admin",
  "recruiter",
  "sourcer",
  "consultant",
  "hiring_manager",
  "viewer",
];

describe("matriz de capacidades", () => {
  it("owner y admin pueden todo", () => {
    const todas: Capability[] = [
      "jobs.view",
      "jobs.manage",
      "candidates.manage",
      "applications.add",
      "pipeline.move",
      "interviews.manage",
      "notes.write",
      "shortlists.manage",
      "clients.manage",
      "requisitions.review",
      "stages.configure",
      "settings.stages_template",
      "offers.manage",
      "messaging.send",
      "sourcing.use",
      "reports.view",
      "career_site.manage",
      "team.manage",
      "billing.view",
      "community.appear",
      "integrations.connect",
      "ai.use",
    ];
    for (const role of ["owner", "admin"] as OrgRole[]) {
      for (const cap of todas) {
        expect(can(role, cap), `${role} debería poder ${cap}`).toBe(true);
      }
    }
  });

  describe("recruiter", () => {
    it("opera búsquedas, candidatos, pipeline y comunicación de punta a punta", () => {
      for (const cap of [
        "jobs.view",
        "jobs.manage",
        "candidates.manage",
        "applications.add",
        "pipeline.move",
        "stages.configure",
        "offers.manage",
        "shortlists.manage",
        "interviews.manage",
        "messaging.send",
        "sourcing.use",
        "reports.view",
        "clients.manage",
        "requisitions.review",
        "community.appear",
      ] as Capability[]) {
        expect(can("recruiter", cap), `recruiter debería poder ${cap}`).toBe(true);
      }
    });

    it("no administra Equipo, Career Site, facturación ni la plantilla de etapas", () => {
      expect(can("recruiter", "team.manage")).toBe(false);
      expect(can("recruiter", "career_site.manage")).toBe(false);
      expect(can("recruiter", "billing.view")).toBe(false);
      expect(can("recruiter", "settings.stages_template")).toBe(false);
    });
  });

  describe("sourcer", () => {
    it("ve búsquedas asignadas, carga candidatos, sourcea, ve reportes y mensajes", () => {
      for (const cap of [
        "jobs.view",
        "candidates.manage",
        "applications.add",
        "sourcing.use",
        "reports.view",
        "messaging.send",
        "ai.use",
      ] as Capability[]) {
        expect(can("sourcer", cap), `sourcer debería poder ${cap}`).toBe(true);
      }
    });

    it("no opera el pipeline ni la búsqueda en sí", () => {
      expect(can("sourcer", "jobs.manage")).toBe(false);
      expect(can("sourcer", "pipeline.move")).toBe(false);
      expect(can("sourcer", "stages.configure")).toBe(false);
      expect(can("sourcer", "offers.manage")).toBe(false);
      expect(can("sourcer", "shortlists.manage")).toBe(false);
    });

    it("no tiene agenda, integraciones ni puede aparecer en la comunidad", () => {
      expect(can("sourcer", "interviews.manage")).toBe(false);
      expect(can("sourcer", "integrations.connect")).toBe(false);
      expect(can("sourcer", "community.appear")).toBe(false);
    });
  });

  describe("consultant (consultor externo)", () => {
    it("ve búsquedas asignadas, candidatos, sourcing, mensajes y agenda", () => {
      for (const cap of [
        "jobs.view",
        "candidates.manage",
        "sourcing.use",
        "messaging.send",
        "interviews.manage",
        "integrations.connect",
        "community.appear",
      ] as Capability[]) {
        expect(can("consultant", cap), `consultant debería poder ${cap}`).toBe(true);
      }
    });

    it("no crea búsquedas, no ve reportes/clientes/solicitudes", () => {
      expect(can("consultant", "jobs.manage")).toBe(false);
      expect(can("consultant", "reports.view")).toBe(false);
      expect(can("consultant", "clients.manage")).toBe(false);
      expect(can("consultant", "requisitions.review")).toBe(false);
    });
  });

  describe("hiring_manager", () => {
    it("carga solicitudes, opera agenda y sourcing, ve búsquedas y candidatos", () => {
      for (const cap of [
        "jobs.view",
        "candidates.manage",
        "interviews.manage",
        "sourcing.use",
        "requisitions.review",
        "settings.stages_template",
      ] as Capability[]) {
        expect(can("hiring_manager", cap), `hiring_manager debería poder ${cap}`).toBe(true);
      }
    });

    it("no administra Equipo, Career Site, facturación ni aparece en la comunidad", () => {
      expect(can("hiring_manager", "team.manage")).toBe(false);
      expect(can("hiring_manager", "career_site.manage")).toBe(false);
      expect(can("hiring_manager", "billing.view")).toBe(false);
      expect(can("hiring_manager", "community.appear")).toBe(false);
    });

    it("no opera el pipeline ni gestiona ofertas o shortlist", () => {
      expect(can("hiring_manager", "pipeline.move")).toBe(false);
      expect(can("hiring_manager", "offers.manage")).toBe(false);
      expect(can("hiring_manager", "shortlists.manage")).toBe(false);
    });
  });

  it("viewer sigue sin especificar: solo lectura", () => {
    expect(isReadOnly("viewer")).toBe(true);
    expect(can("viewer", "jobs.view")).toBe(false);
  });

  it("los roles que operan no son de solo lectura", () => {
    for (const role of [
      "owner",
      "admin",
      "recruiter",
      "sourcer",
      "consultant",
      "hiring_manager",
    ] as OrgRole[]) {
      expect(isReadOnly(role)).toBe(false);
    }
  });

  it("canManageRecruiting sigue significando lo mismo que antes", () => {
    expect(canManageRecruiting("owner")).toBe(true);
    expect(canManageRecruiting("admin")).toBe(true);
    expect(canManageRecruiting("recruiter")).toBe(true);
    expect(canManageRecruiting("sourcer")).toBe(false);
    expect(canManageRecruiting("consultant")).toBe(false);
    expect(canManageRecruiting("viewer")).toBe(false);
    expect(canManageRecruiting("hiring_manager")).toBe(false);
  });

  it("recruiter, sourcer y consultant quedan acotados a sus búsquedas asignadas", () => {
    expect(isAssignmentScoped("recruiter")).toBe(true);
    expect(isAssignmentScoped("sourcer")).toBe(true);
    expect(isAssignmentScoped("consultant")).toBe(true);
  });

  it("owner, admin y hiring_manager no quedan acotados por asignación", () => {
    expect(isAssignmentScoped("owner")).toBe(false);
    expect(isAssignmentScoped("admin")).toBe(false);
    expect(isAssignmentScoped("hiring_manager")).toBe(false);
  });

  it("todos los roles tienen etiqueta y descripción", () => {
    for (const role of TODOS) {
      expect(ROLE_LABELS[role]?.length ?? 0).toBeGreaterThan(0);
      expect(ROLE_DESCRIPTIONS[role]?.length ?? 0).toBeGreaterThan(0);
    }
  });
});
