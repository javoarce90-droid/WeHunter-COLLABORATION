import { describe, it, expect } from "vitest";
import { construirTarjetasComunidad, construirPerfilComunidad } from "./listar-comunidad";
import type { CommunityProfile } from "../data/community.data";

function makeProfile(overrides: Partial<CommunityProfile> = {}): CommunityProfile {
  return {
    id: "profile-1",
    fullName: "Ana Pérez",
    avatarUrl: "https://signed.example/avatar.png",
    jobTitle: "Recruiter Senior",
    bio: "Especialista en tech.",
    location: "Buenos Aires, Argentina",
    specialties: ["Tecnología", "Producto"],
    yearsOfExperience: 8,
    linkedinUrl: "https://linkedin.com/in/anaperez",
    phone: "+54 9 11 1234-5678",
    organizationName: "Inspired Way",
    organizationSlug: "inspired-way",
    ...overrides,
  };
}

describe("construirTarjetasComunidad", () => {
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

  it("usa lista vacía si el perfil no cargó especialidades", () => {
    const [card] = construirTarjetasComunidad([makeProfile({ specialties: null })]);
    expect(card.specialties).toEqual([]);
  });

  it("trae location y yearsOfExperience tal cual", () => {
    const [card] = construirTarjetasComunidad([makeProfile()]);
    expect(card.location).toBe("Buenos Aires, Argentina");
    expect(card.yearsOfExperience).toBe(8);
  });
});

describe("construirPerfilComunidad", () => {
  it("arma el link de wa.me a partir del teléfono, sin símbolos", () => {
    const card = construirPerfilComunidad(makeProfile());
    expect(card.whatsappHref).toBe(
      "https://wa.me/5491112345678?text=" +
        encodeURIComponent("Hola! Te encontré en la Comunidad de WeHunter."),
    );
  });

  it("sin teléfono no arma whatsappHref", () => {
    const card = construirPerfilComunidad(makeProfile({ phone: null }));
    expect(card.whatsappHref).toBeNull();
  });

  it("expone el linkedinUrl tal cual", () => {
    const card = construirPerfilComunidad(makeProfile());
    expect(card.linkedinUrl).toBe("https://linkedin.com/in/anaperez");
  });
});
