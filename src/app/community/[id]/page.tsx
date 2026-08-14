import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { obtenerPerfilComunidad } from "@/features/company/community/domain/listar-comunidad";
import { CommunityHeader } from "@/features/company/community/ui/CommunityHeader";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await obtenerPerfilComunidad(id);
  if (!profile) return { title: "Perfil no encontrado · WeHunter" };
  return {
    title: `${profile.fullName} · Comunidad WeHunter`,
    description: profile.bio ?? undefined,
  };
}

/** Perfil público completo de un miembro de la Comunidad — CTA "Ver perfil" de la card. */
export default async function CommunityProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await obtenerPerfilComunidad(id);
  if (!profile) notFound();

  return (
    <div className="min-h-dvh bg-bg">
      <CommunityHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Link
          href="/community"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted transition-colors hover:text-primary"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m15 18-6-6 6-6" />
          </svg>
          Volver a la Comunidad
        </Link>

        <div className="rounded-[var(--radius)] border border-border bg-surface p-6 shadow-[var(--shadow)] sm:p-8">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center bg-primary-light text-xl font-bold text-primary-hover">
                  {profile.fullName
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0]?.toUpperCase())
                    .join("")}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-bold text-text">{profile.fullName}</h1>
              {profile.jobTitle && (
                <p className="truncate text-sm font-semibold text-text">{profile.jobTitle}</p>
              )}
              {profile.careerSiteHref ? (
                <Link href={profile.careerSiteHref} className="text-xs font-semibold text-primary hover:underline">
                  {profile.organizationName}
                </Link>
              ) : (
                <p className="text-xs text-muted">{profile.organizationName}</p>
              )}
            </div>
          </div>

          {(profile.location || profile.yearsOfExperience != null) && (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              {profile.location && <span>{profile.location}</span>}
              {profile.yearsOfExperience != null && (
                <span>+{profile.yearsOfExperience} años de experiencia</span>
              )}
            </div>
          )}

          {profile.bio && (
            <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-text/80">{profile.bio}</p>
          )}

          {profile.specialties.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {profile.specialties.map((s) => (
                <Badge key={s} variant="primary">
                  {s}
                </Badge>
              ))}
            </div>
          )}

          {(profile.whatsappHref || profile.linkedinUrl) && (
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
              {profile.whatsappHref && (
                <a
                  href={profile.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "primary", size: "default" })}
                >
                  Contactar por WhatsApp
                </a>
              )}
              {profile.linkedinUrl && (
                <a
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "secondary", size: "default" })}
                >
                  Ver LinkedIn
                </a>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
