import { describe, it, expect } from "vitest";
import {
  computeDuplicates,
  normalizeEmailKey,
  normalizeLinkedinKey,
  type DuplicateKeyed,
} from "./duplicate-keys";

describe("normalizeEmailKey / normalizeLinkedinKey", () => {
  it("normaliza case y espacios, null si está vacío", () => {
    expect(normalizeEmailKey(" Ana@Ejemplo.com ")).toBe("ana@ejemplo.com");
    expect(normalizeEmailKey(null)).toBeNull();
    expect(normalizeEmailKey("")).toBeNull();
  });

  it("normaliza el trailing slash de LinkedIn", () => {
    expect(normalizeLinkedinKey("https://linkedin.com/in/ana/")).toBe(
      "https://linkedin.com/in/ana",
    );
    expect(normalizeLinkedinKey(null)).toBeNull();
  });
});

describe("computeDuplicates", () => {
  it("marca como duplicados a los que comparten email, no a los que no", () => {
    const { duplicateIds } = computeDuplicates([
      { id: "1", email: "a@a.com", linkedinUrl: null },
      { id: "2", email: "a@a.com", linkedinUrl: null },
      { id: "3", email: "b@b.com", linkedinUrl: null },
    ]);
    expect(duplicateIds).toEqual(new Set(["1", "2"]));
  });

  it("también detecta por LinkedIn, cross-row (no solo dentro de una página)", () => {
    const many: DuplicateKeyed[] = Array.from({ length: 20 }, (_, i) => ({
      id: `id-${i}`,
      email: null,
      linkedinUrl: null,
    }));
    many[0]!.linkedinUrl = "https://linkedin.com/in/dup";
    many[19]!.linkedinUrl = "https://linkedin.com/in/dup/";
    const { duplicateIds, dupKeyOf } = computeDuplicates(many);
    expect(duplicateIds).toEqual(new Set(["id-0", "id-19"]));
    expect(dupKeyOf.get("id-0")).toBe(dupKeyOf.get("id-19"));
  });

  it("sin coincidencias no marca a nadie", () => {
    const { duplicateIds } = computeDuplicates([
      { id: "1", email: "a@a.com", linkedinUrl: null },
      { id: "2", email: "b@b.com", linkedinUrl: null },
    ]);
    expect(duplicateIds.size).toBe(0);
  });
});
