import { describe, it, expect } from "vitest";
import {
  buildBooleanQuery,
  generateSourcingResults,
  platformToSource,
  type SourcingQuery,
} from "./sourcing";

const q = (over: Partial<SourcingQuery> = {}): SourcingQuery => ({
  keywords: ["React", "Node"],
  location: "Buenos Aires",
  seniority: "senior",
  platforms: ["LinkedIn"],
  ...over,
});

describe("buildBooleanQuery", () => {
  it("combina keywords con OR y el resto con AND", () => {
    expect(buildBooleanQuery(q())).toBe('("React" OR "Node") AND "Buenos Aires" AND "senior"');
  });

  it("una sola keyword va sin paréntesis", () => {
    expect(buildBooleanQuery(q({ keywords: ["Go"], location: null, seniority: null }))).toBe('"Go"');
  });

  it("ignora vacíos", () => {
    expect(buildBooleanQuery(q({ keywords: [" "], location: null, seniority: null }))).toBe("");
  });
});

describe("generateSourcingResults", () => {
  it("es determinístico para la misma query", () => {
    const a = generateSourcingResults(q());
    const b = generateSourcingResults(q());
    expect(a).toEqual(b);
  });

  it("cambia con la query", () => {
    const a = generateSourcingResults(q());
    const b = generateSourcingResults(q({ keywords: ["Python"] }));
    expect(a[0].name === b[0].name && a[0].headline === b[0].headline).toBe(false);
  });

  it("respeta la cantidad y usa las plataformas elegidas", () => {
    const r = generateSourcingResults(q({ platforms: ["GitHub"] }), 5);
    expect(r).toHaveLength(5);
    expect(r.every((x) => x.platform === "GitHub")).toBe(true);
  });

  it("deriva skills de los keywords", () => {
    const r = generateSourcingResults(q());
    expect(r[0].skills).toContain("React");
  });
});

describe("platformToSource", () => {
  it("mapea plataformas a fuente de candidato", () => {
    expect(platformToSource("LinkedIn")).toBe("linkedin");
    expect(platformToSource("Computrabajo")).toBe("job_board");
    expect(platformToSource("GitHub")).toBe("other");
  });
});
