import { describe, it, expect } from "vitest";
import { can, canManageRecruiting, isReadOnly, ROLE_LABELS, ROLE_DESCRIPTIONS } from "./roles";
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
  it("owner, admin y recruiter conservan todo lo que podían antes", () => {
    const antes: Capability[] = [
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
      "offers.manage",
      "messaging.send",
      "ai.use",
    ];
    for (const role of ["owner", "admin", "recruiter"] as OrgRole[]) {
      for (const cap of antes) {
        expect(can(role, cap), `${role} debería poder ${cap}`).toBe(true);
      }
    }
  });

  describe("sourcer", () => {
    it("puede cargar y actualizar candidatos, proponerlos y anotar", () => {
      expect(can("sourcer", "candidates.manage")).toBe(true);
      expect(can("sourcer", "applications.add")).toBe(true);
      expect(can("sourcer", "notes.write")).toBe(true);
      expect(can("sourcer", "ai.use")).toBe(true);
    });

    it("no crea ni publica búsquedas", () => {
      expect(can("sourcer", "jobs.manage")).toBe(false);
      expect(can("sourcer", "stages.configure")).toBe(false);
    });

    it("no mueve el pipeline ni gestiona ofertas o comunicaciones", () => {
      expect(can("sourcer", "pipeline.move")).toBe(false);
      expect(can("sourcer", "offers.manage")).toBe(false);
      expect(can("sourcer", "messaging.send")).toBe(false);
    });
  });

  describe("roles sin capacidades operativas", () => {
    // consultant y hiring_manager quedan vacíos a propósito: sus permisos dependen de
    // "búsquedas asignadas", que todavía no existe. Ver el comentario de la matriz.
    it.each(["viewer", "consultant", "hiring_manager"] as OrgRole[])(
      "%s no puede ejecutar ninguna acción",
      (role) => {
        expect(isReadOnly(role)).toBe(true);
        expect(can(role, "jobs.manage")).toBe(false);
        expect(can(role, "pipeline.move")).toBe(false);
        expect(can(role, "candidates.manage")).toBe(false);
        expect(can(role, "notes.write")).toBe(false);
      },
    );
  });

  it("los roles que operan no son de solo lectura", () => {
    for (const role of ["owner", "admin", "recruiter", "sourcer"] as OrgRole[]) {
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

  it("todos los roles tienen etiqueta y descripción", () => {
    for (const role of TODOS) {
      expect(ROLE_LABELS[role]?.length ?? 0).toBeGreaterThan(0);
      expect(ROLE_DESCRIPTIONS[role]?.length ?? 0).toBeGreaterThan(0);
    }
  });
});
