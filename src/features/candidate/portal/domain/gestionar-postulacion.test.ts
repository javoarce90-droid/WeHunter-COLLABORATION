import { describe, it, expect } from "vitest";
import { crearPostulacion, retirarPostulacion, type MockApplication } from "./gestionar-postulacion";
import { type Job } from "../data/mock-jobs";

const testJob: Job = {
  id: "job-1",
  title: "React Developer",
  company: "TechCorp",
  description: "Description",
  location: "Buenos Aires",
  workplaceType: "Híbrido",
  salary: "$1.000.000",
  tags: ["React"],
  defaultStage: "screening",
};

describe("gestionar-postulacion", () => {
  describe("crearPostulacion", () => {
    it("debería crear una postulación exitosamente con los datos correctos", () => {
      const existing: MockApplication[] = [];
      const result = crearPostulacion(testJob, "Alejandro López", "cv_alejandro.pdf", existing, "24/6/2026");

      expect(result.newApplication).toEqual({
        jobId: "job-1",
        jobTitle: "React Developer",
        company: "TechCorp",
        appliedAt: "24/6/2026",
        stage: "screening",
        fullName: "Alejandro López",
        cvName: "cv_alejandro.pdf",
      });

      expect(result.updatedApplications).toHaveLength(1);
      expect(result.updatedApplications[0]).toEqual(result.newApplication);
    });

    it("debería anteponer la nueva postulación en la lista existente", () => {
      const oldApp: MockApplication = {
        jobId: "job-2",
        jobTitle: "Node Developer",
        company: "Devs Inc",
        appliedAt: "20/6/2026",
        stage: "new",
        fullName: "Alejandro López",
        cvName: "cv_alejandro.pdf",
      };

      const result = crearPostulacion(testJob, "Alejandro López", "cv_alejandro.pdf", [oldApp], "24/6/2026");

      expect(result.updatedApplications).toHaveLength(2);
      expect(result.updatedApplications[0]?.jobId).toBe("job-1");
      expect(result.updatedApplications[1]?.jobId).toBe("job-2");
    });

    it("debería lanzar un error si el nombre está vacío", () => {
      expect(() => {
        crearPostulacion(testJob, "", "cv.pdf", []);
      }).toThrow();
    });

    it("debería lanzar un error si el nombre de archivo del CV está vacío", () => {
      expect(() => {
        crearPostulacion(testJob, "Alejandro", "", []);
      }).toThrow();
    });
  });

  describe("retirarPostulacion", () => {
    it("debería remover la postulación correspondiente por jobId", () => {
      const apps: MockApplication[] = [
        {
          jobId: "job-1",
          jobTitle: "React Developer",
          company: "TechCorp",
          appliedAt: "24/6/2026",
          stage: "screening",
          fullName: "Alejandro López",
          cvName: "cv.pdf",
        },
        {
          jobId: "job-2",
          jobTitle: "Node Developer",
          company: "Devs Inc",
          appliedAt: "20/6/2026",
          stage: "new",
          fullName: "Alejandro López",
          cvName: "cv.pdf",
        },
      ];

      const result = retirarPostulacion(apps, "job-1");

      expect(result).toHaveLength(1);
      expect(result[0]?.jobId).toBe("job-2");
    });
  });
});
