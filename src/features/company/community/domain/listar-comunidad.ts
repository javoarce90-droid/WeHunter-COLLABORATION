import { getCommunityProfiles, type CommunityProfile } from "../data/community.data";

export type CommunityCard = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  organizationName: string;
  /** null cuando esa organización no tiene el Career Site habilitado. */
  careerSiteHref: string | null;
  /** null cuando el perfil no cargó teléfono: sin eso no hay forma de armar el link de wa.me. */
  whatsappHref: string | null;
};

const COMMUNITY_WHATSAPP_MESSAGE = "Hola! Te encontré en la Comunidad de WeHunter.";

/** wa.me solo acepta dígitos (código de país + número, sin "+" ni separadores). */
function buildWhatsappHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(COMMUNITY_WHATSAPP_MESSAGE)}`;
}

export function construirTarjetasComunidad(profiles: CommunityProfile[]): CommunityCard[] {
  return profiles.map((profile) => ({
    id: profile.id,
    fullName: profile.fullName ?? "Sin nombre",
    avatarUrl: profile.avatarUrl,
    jobTitle: profile.jobTitle,
    bio: profile.bio,
    linkedinUrl: profile.linkedinUrl,
    organizationName: profile.organizationName,
    careerSiteHref: profile.organizationSlug ? `/careers/${profile.organizationSlug}` : null,
    whatsappHref: profile.phone ? buildWhatsappHref(profile.phone) : null,
  }));
}

export async function listarComunidad(): Promise<CommunityCard[]> {
  const profiles = await getCommunityProfiles();
  return construirTarjetasComunidad(profiles);
}
