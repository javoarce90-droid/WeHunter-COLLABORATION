import { describe, it, expect } from "vitest";
import {
  combinarBorradorConCandidato,
  type CandidatoParaCombinar,
} from "./combinar-borrador-candidato";
import type { DraftCandidateProfile } from "@/lib/ai";

const candidatoVacio: CandidatoParaCombinar = {
  headline: null,
  location: null,
  linkedinUrl: null,
  summary: null,
  phone: null,
  email: null,
  skills: null,
  experiencias: [],
  educacion: [],
  certificaciones: [],
};

function borrador(over: Partial<DraftCandidateProfile> = {}): DraftCandidateProfile {
  return {
    fullName: "Ada Lovelace",
    email: null,
    phone: null,
    headline: "",
    location: null,
    linkedinUrl: null,
    summary: "",
    skills: [],
    workExperiences: [],
    education: [],
    certifications: [],
    ...over,
  };
}

describe("combinarBorradorConCandidato", () => {
  it("rellena los campos planos vacíos con lo que trae la IA", () => {
    const res = combinarBorradorConCandidato(
      candidatoVacio,
      borrador({
        headline: "Frontend Senior",
        location: "Córdoba, Argentina",
        phone: "+54 351 555-1234",
        summary: "10 años en frontend.",
      }),
    );
    expect(res.campos.headline).toBe("Frontend Senior");
    expect(res.campos.location).toBe("Córdoba, Argentina");
    expect(res.campos.phone).toBe("+54 351 555-1234");
    expect(res.campos.summary).toBe("10 años en frontend.");
    expect(res.aportes).toEqual(
      expect.arrayContaining(["titular", "ubicación", "teléfono", "resumen profesional"]),
    );
  });

  it("nunca pisa un campo plano que ya tiene valor", () => {
    const res = combinarBorradorConCandidato(
      { ...candidatoVacio, headline: "Tech Lead", location: "Rosario" },
      borrador({ headline: "Frontend Senior", location: "Córdoba" }),
    );
    expect(res.campos.headline).toBe("Tech Lead");
    expect(res.campos.location).toBe("Rosario");
    expect(res.aportes).not.toContain("titular");
    expect(res.aportes).not.toContain("ubicación");
  });

  it("ignora los campos vacíos del borrador (no los cuenta como aporte)", () => {
    const res = combinarBorradorConCandidato(candidatoVacio, borrador({ headline: "   " }));
    expect(res.campos.headline).toBeNull();
    expect(res.aportes).toHaveLength(0);
  });

  it("une las skills sin duplicar (match laxo por mayúsculas/espacios)", () => {
    const res = combinarBorradorConCandidato(
      { ...candidatoVacio, skills: ["React", "TypeScript"] },
      borrador({ skills: ["react", "  TypeScript ", "GraphQL"] }),
    );
    expect(res.campos.skills).toEqual(["React", "TypeScript", "GraphQL"]);
    expect(res.aportes).toContain("1 skill");
  });

  it("suma solo las experiencias que el candidato no tiene ya (match por empresa+puesto)", () => {
    const res = combinarBorradorConCandidato(
      {
        ...candidatoVacio,
        experiencias: [{ company: "Google Inc", position: "SWE" }],
      },
      borrador({
        workExperiences: [
          expDraft("google inc", "swe"),
          expDraft("Meta", "Senior Engineer"),
        ],
      }),
    );
    expect(res.nuevasExperiencias).toHaveLength(1);
    expect(res.nuevasExperiencias[0]?.company).toBe("Meta");
    expect(res.aportes).toContain("1 experiencia");
  });

  it("deduplica educación y certificaciones", () => {
    const res = combinarBorradorConCandidato(
      {
        ...candidatoVacio,
        educacion: [{ institution: "UNC", degree: "Ing. en Sistemas" }],
        certificaciones: [{ name: "AWS SAA" }],
      },
      borrador({
        education: [
          eduDraft("unc", "ing. en sistemas"),
          eduDraft("MIT", "MSc"),
        ],
        certifications: [{ name: "aws saa", url: null }, { name: "CKA", url: null }],
      }),
    );
    expect(res.nuevaEducacion.map((e) => e.institution)).toEqual(["MIT"]);
    expect(res.nuevasCertificaciones.map((c) => c.name)).toEqual(["CKA"]);
  });

  it("sin aportes cuando la IA no agrega nada nuevo", () => {
    const res = combinarBorradorConCandidato(
      { ...candidatoVacio, headline: "Dev", skills: ["Go"] },
      borrador({ headline: "Otro", skills: ["go"] }),
    );
    expect(res.aportes).toHaveLength(0);
  });
});

function expDraft(company: string, position: string) {
  return {
    company,
    position,
    startDate: null,
    endDate: null,
    description: null,
    employmentType: null,
    modality: null,
    skills: [],
  };
}

function eduDraft(institution: string, degree: string) {
  return {
    institution,
    degree,
    fieldOfStudy: null,
    startDate: null,
    endDate: null,
    description: null,
    grade: null,
    activities: null,
  };
}
