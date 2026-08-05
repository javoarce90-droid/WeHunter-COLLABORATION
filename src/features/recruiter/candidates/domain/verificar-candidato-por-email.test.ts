import { describe, it, expect, vi } from "vitest";
import {
  verificarCandidatoPorEmail,
  type VerificarCandidatoPorEmailDeps,
} from "./verificar-candidato-por-email";

const deps = (): VerificarCandidatoPorEmailDeps => ({
  findDuplicateCandidate: vi.fn(async () => null),
  findLinkableProfile: vi.fn(async () => null),
});
const ctx = { organizationId: "org-1", role: "recruiter" as const };

describe("verificarCandidatoPorEmail", () => {
  it("no revisa nada sin sesión/organization", async () => {
    const d = deps();
    const res = await verificarCandidatoPorEmail(
      "ada@example.com",
      { organizationId: null, role: null },
      d,
    );
    expect(res).toEqual({});
    expect(d.findDuplicateCandidate).not.toHaveBeenCalled();
  });

  it("no revisa nada para el viewer", async () => {
    const d = deps();
    const res = await verificarCandidatoPorEmail(
      "ada@example.com",
      { ...ctx, role: "viewer" },
      d,
    );
    expect(res).toEqual({});
    expect(d.findDuplicateCandidate).not.toHaveBeenCalled();
  });

  it("no revisa nada con email vacío", async () => {
    const d = deps();
    const res = await verificarCandidatoPorEmail("   ", ctx, d);
    expect(res).toEqual({});
    expect(d.findDuplicateCandidate).not.toHaveBeenCalled();
  });

  it("devuelve el duplicado si hay un candidato con ese email en la org", async () => {
    const d = deps();
    d.findDuplicateCandidate = vi.fn(async () => ({
      id: "cand-1",
      fullName: "Ada Lovelace",
      matchedBy: "email" as const,
    }));
    const res = await verificarCandidatoPorEmail("ada@example.com", ctx, d);
    expect(res).toEqual({
      duplicate: { id: "cand-1", fullName: "Ada Lovelace", matchedBy: "email" },
    });
    expect(d.findLinkableProfile).not.toHaveBeenCalled();
  });

  it("devuelve profileMatch si no hay duplicado pero sí una cuenta real", async () => {
    const d = deps();
    d.findLinkableProfile = vi.fn(async () => ({
      profileId: "profile-1",
      bio: null,
      skills: null,
      cvUrl: null,
    }));
    const res = await verificarCandidatoPorEmail("ada@example.com", ctx, d);
    expect(res).toEqual({ profileMatch: true });
  });

  it("no devuelve nada si no hay ni duplicado ni cuenta vinculable", async () => {
    const d = deps();
    const res = await verificarCandidatoPorEmail("nadie@example.com", ctx, d);
    expect(res).toEqual({});
  });
});
