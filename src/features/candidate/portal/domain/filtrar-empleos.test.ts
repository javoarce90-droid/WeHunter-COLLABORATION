import { describe, it, expect } from "vitest";
import { filtrarEmpleos } from "./filtrar-empleos";
import { type Job } from "../data/mock-jobs";

const testJobs: Job[] = [
  {
    id: "job-1",
    organizationId: "org-1",
    title: "React Developer",
    company: "TechCorp",
    description: "React dev needed.",
    location: "Buenos Aires, AR",
    workplaceType: "Híbrido",
    salary: "$1.000.000",
    tags: ["React", "TypeScript"],
    defaultStage: "new",
    jobArea: null,
    seniority: null,
    employmentType: null,
    vacancies: null,
    objectives: null,
    requirements: null,
    responsibilities: null,
    benefits: null,
  },
  {
    id: "job-2",
    organizationId: "org-2",
    title: "Node.js Developer",
    company: "Devs Inc",
    description: "Backend node dev.",
    location: "Remoto",
    workplaceType: "Remoto",
    salary: "$2.000 USD",
    tags: ["Node.js", "Javascript"],
    defaultStage: "screening",
    jobArea: null,
    seniority: null,
    employmentType: null,
    vacancies: null,
    objectives: null,
    requirements: null,
    responsibilities: null,
    benefits: null,
  },
  {
    id: "job-3",
    organizationId: "org-3",
    title: "UI/UX Designer",
    company: "Creative Studio",
    description: "Designing stuff.",
    location: "Santiago, Chile",
    workplaceType: "Presencial",
    salary: "$1.500 USD",
    tags: ["Figma", "UI/UX"],
    defaultStage: "interview",
    jobArea: null,
    seniority: null,
    employmentType: null,
    vacancies: null,
    objectives: null,
    requirements: null,
    responsibilities: null,
    benefits: null,
  },
];

describe("filtrarEmpleos", () => {
  it("debería retornar todos los empleos si no hay filtros activos", () => {
    const result = filtrarEmpleos({
      jobs: testJobs,
      appliedIds: [],
      search: "",
      locationFilter: "",
    });
    expect(result).toHaveLength(3);
  });

  it("debería excluir empleos a los que el candidato ya se postuló", () => {
    const result = filtrarEmpleos({
      jobs: testJobs,
      appliedIds: ["job-2"],
      search: "",
      locationFilter: "",
    });
    expect(result).toHaveLength(2);
    expect(result.map((j) => j.id)).not.toContain("job-2");
  });

  it("debería buscar por título de forma insensible a mayúsculas", () => {
    const result = filtrarEmpleos({
      jobs: testJobs,
      appliedIds: [],
      search: "react",
      locationFilter: "",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("job-1");
  });

  it("debería buscar por compañía de forma insensible a mayúsculas", () => {
    const result = filtrarEmpleos({
      jobs: testJobs,
      appliedIds: [],
      search: "devs",
      locationFilter: "",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("job-2");
  });

  it("debería buscar por tags", () => {
    const result = filtrarEmpleos({
      jobs: testJobs,
      appliedIds: [],
      search: "figma",
      locationFilter: "",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("job-3");
  });

  it("debería filtrar por ubicación", () => {
    const result = filtrarEmpleos({
      jobs: testJobs,
      appliedIds: [],
      search: "",
      locationFilter: "remoto",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("job-2");
  });

  it("debería combinar búsqueda y ubicación correctamente", () => {
    const result = filtrarEmpleos({
      jobs: testJobs,
      appliedIds: [],
      search: "developer",
      locationFilter: "remoto",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("job-2");
  });

  it("debería combinar la exclusión de postulados con el resto de los filtros", () => {
    const result = filtrarEmpleos({
      jobs: testJobs,
      appliedIds: ["job-1"],
      search: "developer",
      locationFilter: "",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("job-2");
  });
});
