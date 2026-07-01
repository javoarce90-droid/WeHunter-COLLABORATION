import { describe, it, expect } from "vitest";
import { filtrarEmpleos } from "./filtrar-empleos";
import { type Job } from "../data/mock-jobs";

const testJobs: Job[] = [
  {
    id: "job-1",
    title: "React Developer",
    company: "TechCorp",
    description: "React dev needed.",
    location: "Buenos Aires, AR",
    workplaceType: "Híbrido",
    salary: "$1.000.000",
    tags: ["React", "TypeScript"],
    defaultStage: "new",
  },
  {
    id: "job-2",
    title: "Node.js Developer",
    company: "Devs Inc",
    description: "Backend node dev.",
    location: "Remoto",
    workplaceType: "Remoto",
    salary: "$2.000 USD",
    tags: ["Node.js", "Javascript"],
    defaultStage: "screening",
  },
  {
    id: "job-3",
    title: "UI/UX Designer",
    company: "Creative Studio",
    description: "Designing stuff.",
    location: "Santiago, Chile",
    workplaceType: "Presencial",
    salary: "$1.500 USD",
    tags: ["Figma", "UI/UX"],
    defaultStage: "interview",
  },
];

describe("filtrarEmpleos", () => {
  it("debería retornar todos los empleos si no hay filtros activos", () => {
    const result = filtrarEmpleos({
      jobs: testJobs,
      hiddenIds: [],
      favoriteIds: [],
      search: "",
      locationFilter: "",
      filterTab: "all",
    });
    expect(result).toHaveLength(3);
  });

  it("debería excluir empleos ocultos en pestaña 'all'", () => {
    const result = filtrarEmpleos({
      jobs: testJobs,
      hiddenIds: ["job-2"],
      favoriteIds: [],
      search: "",
      locationFilter: "",
      filterTab: "all",
    });
    expect(result).toHaveLength(2);
    expect(result.map((j) => j.id)).not.toContain("job-2");
  });

  it("debería buscar por título de forma insensible a mayúsculas", () => {
    const result = filtrarEmpleos({
      jobs: testJobs,
      hiddenIds: [],
      favoriteIds: [],
      search: "react",
      locationFilter: "",
      filterTab: "all",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("job-1");
  });

  it("debería buscar por compañía de forma insensible a mayúsculas", () => {
    const result = filtrarEmpleos({
      jobs: testJobs,
      hiddenIds: [],
      favoriteIds: [],
      search: "devs",
      locationFilter: "",
      filterTab: "all",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("job-2");
  });

  it("debería buscar por tags", () => {
    const result = filtrarEmpleos({
      jobs: testJobs,
      hiddenIds: [],
      favoriteIds: [],
      search: "figma",
      locationFilter: "",
      filterTab: "all",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("job-3");
  });

  it("debería filtrar por ubicación", () => {
    const result = filtrarEmpleos({
      jobs: testJobs,
      hiddenIds: [],
      favoriteIds: [],
      search: "",
      locationFilter: "remoto",
      filterTab: "all",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("job-2");
  });

  it("debería combinar búsqueda y ubicación correctamente", () => {
    const result = filtrarEmpleos({
      jobs: testJobs,
      hiddenIds: [],
      favoriteIds: [],
      search: "developer",
      locationFilter: "remoto",
      filterTab: "all",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("job-2");
  });

  it("debería filtrar por favoritos en la pestaña 'favorites'", () => {
    const result = filtrarEmpleos({
      jobs: testJobs,
      hiddenIds: [],
      favoriteIds: ["job-1", "job-3"],
      search: "",
      locationFilter: "",
      filterTab: "favorites",
    });
    expect(result).toHaveLength(2);
    expect(result.map((j) => j.id)).toContain("job-1");
    expect(result.map((j) => j.id)).toContain("job-3");
    expect(result.map((j) => j.id)).not.toContain("job-2");
  });

  it("debería excluir ocultos en la pestaña 'favorites'", () => {
    const result = filtrarEmpleos({
      jobs: testJobs,
      hiddenIds: ["job-1"],
      favoriteIds: ["job-1", "job-3"],
      search: "",
      locationFilter: "",
      filterTab: "favorites",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("job-3");
  });

  it("debería mostrar solo los empleos ocultos en la pestaña 'hidden'", () => {
    const result = filtrarEmpleos({
      jobs: testJobs,
      hiddenIds: ["job-2"],
      favoriteIds: [],
      search: "",
      locationFilter: "",
      filterTab: "hidden",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("job-2");
  });
});
