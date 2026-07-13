import { describe, it, expect } from "vitest";
import { normalizeJobDetails } from "./job-details";

describe("normalizeJobDetails", () => {
  it("quita el heading Markdown redundante cuando repite el título de la sección", () => {
    const details = normalizeJobDetails({
      objectives: "## Objetivos del puesto\n- Aportar al equipo.\n",
      requirements: "## Requisitos\n- Experiencia previa.\n",
      responsibilities: "## Responsabilidades\n- Ejecutar tareas.\n",
    });
    expect(details.objectives).toBe("- Aportar al equipo.");
    expect(details.requirements).toBe("- Experiencia previa.");
    expect(details.responsibilities).toBe("- Ejecutar tareas.");
  });

  it("no toca el contenido si no hay heading redundante al inicio", () => {
    const details = normalizeJobDetails({
      objectives: "## Nuestra propuesta\n- Aportar al equipo.\n",
    });
    expect(details.objectives).toBe("## Nuestra propuesta\n- Aportar al equipo.");
  });

  it("es case-insensitive al comparar el heading con el título de la sección", () => {
    const details = normalizeJobDetails({
      requirements: "## requisitos\n- Experiencia previa.\n",
    });
    expect(details.requirements).toBe("- Experiencia previa.");
  });

  it("deja null los campos vacíos", () => {
    const details = normalizeJobDetails({ objectives: "   " });
    expect(details.objectives).toBeNull();
  });
});
