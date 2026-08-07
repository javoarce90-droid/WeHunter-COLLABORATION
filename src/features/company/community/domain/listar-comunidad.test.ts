import { describe, it, expect } from "vitest";
import { construirTarjetasComunidad } from "./listar-comunidad";
import type { CommunityProfile } from "../data/community.data";

function makeProfile(overrides: Partial<CommunityProfile> = {}): CommunityProfile {
  return {
    id: "profile-1",
    fullName: "Ana Pérez",
    avatarUrl: "https://signed.example/avatar.png",
    jobTitle: "Recruiter Senior",
    bio: "Especialista en tech.",
    linkedinUrl: "https://linkedin.com/in/anaperez",
    phone: "+54 9 11 1234-5678",
    organizationName: "Inspired Way",
    organizationSlug: "inspired-way",
    ...overrides,
  };
}

describe("construirTarjetasComunidad", () => {
  it("arma el link de wa.me a partir del teléfono, sin símbolos", () => {
    const [card] = construirTarjetasComunidad([makeProfile()]);
    expect(card.whatsappHref).toBe(
      "https://wa.me/5491112345678?text=" +
        encodeURIComponent("Hola! Te encontré en la Comunidad de WeHunter."),
    );
  });

  it("sin teléfono no arma whatsappHref", () => {
    const [card] = construirTarjetasComunidad([makeProfile({ phone: null })]);
    expect(card.whatsappHref).toBeNull();
  });

  it("solo linkea al Career Site si la organización lo tiene habilitado", () => {
    const [conCareerSite] = construirTarjetasComunidad([makeProfile()]);
    expect(conCareerSite.careerSiteHref).toBe("/careers/inspired-way");

    const [sinCareerSite] = construirTarjetasComunidad([
      makeProfile({ organizationSlug: null }),
    ]);
    expect(sinCareerSite.careerSiteHref).toBeNull();
  });

  it("usa un nombre de reserva si el perfil no tiene fullName", () => {
    const [card] = construirTarjetasComunidad([makeProfile({ fullName: null })]);
    expect(card.fullName).toBe("Sin nombre");
  });
});
