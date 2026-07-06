import { describe, it, expect } from "vitest";
import { aiWorkExperiencesSchema, aiEducationEntriesSchema, aiCertificationsSchema } from "./schema";

describe("aiWorkExperiencesSchema", () => {
  it("acepta un ítem válido con campos nullable", () => {
    const res = aiWorkExperiencesSchema.safeParse([
      { company: "Acme", position: "Dev", startDate: null, employmentType: "full_time", skills: ["React"] },
    ]);
    expect(res.success).toBe(true);
  });

  it("rechaza un employmentType fuera del vocabulario cerrado", () => {
    const res = aiWorkExperiencesSchema.safeParse([
      { company: "Acme", position: "Dev", employmentType: "not_a_real_type" },
    ]);
    expect(res.success).toBe(false);
  });

  it("rechaza sin company/position", () => {
    const res = aiWorkExperiencesSchema.safeParse([{ position: "Dev" }]);
    expect(res.success).toBe(false);
  });

  it("acepta lista vacía", () => {
    expect(aiWorkExperiencesSchema.safeParse([]).success).toBe(true);
  });
});

describe("aiEducationEntriesSchema", () => {
  it("acepta un ítem válido", () => {
    const res = aiEducationEntriesSchema.safeParse([{ institution: "UBA", degree: "Ingeniería" }]);
    expect(res.success).toBe(true);
  });

  it("rechaza sin institution/degree", () => {
    expect(aiEducationEntriesSchema.safeParse([{ institution: "UBA" }]).success).toBe(false);
  });
});

describe("aiCertificationsSchema", () => {
  it("acepta un ítem válido con url null", () => {
    const res = aiCertificationsSchema.safeParse([{ name: "AWS Certified", url: null }]);
    expect(res.success).toBe(true);
  });

  it("rechaza sin name", () => {
    expect(aiCertificationsSchema.safeParse([{ url: "https://x.com" }]).success).toBe(false);
  });
});
