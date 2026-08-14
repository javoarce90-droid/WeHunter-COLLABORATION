import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { CommunityCard as CommunityCardData } from "../domain/listar-comunidad";

const focusRing =
  "outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-surface rounded-[var(--radius)]";

// Paleta acotada (mismos pares fondo/texto que ya usa Badge, contraste WCAG ya validado ahí).
// Determinístico por persona: dos cards sin foto no deben verse idénticas.
const AVATAR_PALETTE = [
  { bg: "bg-primary-light", text: "text-primary-hover" },
  { bg: "bg-[#DBEAFE]", text: "text-[#1E40AF]" },
  { bg: "bg-[#D1FAE5]", text: "text-[#065F46]" },
  { bg: "bg-[#FEF3C7]", text: "text-[#92400E]" },
  { bg: "bg-[#EDE9FE]", text: "text-[#5B21B6]" },
  { bg: "bg-[#F3F4F6]", text: "text-[#374151]" },
];

// Tope visual de la bio en la card (no en el perfil completo, que muestra todo). Cortar por
// palabra entera evita partir una palabra a la mitad.
const BIO_PREVIEW_MAX = 190;
const MAX_VISIBLE_SPECIALTIES = 4;

function avatarColorFor(id: string): { bg: string; text: string } {
  const hash = Array.from(id).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function initials(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function truncateBio(bio: string): string {
  if (bio.length <= BIO_PREVIEW_MAX) return bio;
  const cut = bio.slice(0, BIO_PREVIEW_MAX);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : BIO_PREVIEW_MAX)}…`;
}

export function CommunityCard({ card }: { card: CommunityCardData }) {
  const { id, fullName, avatarUrl, jobTitle, bio, location, specialties, yearsOfExperience, organizationName } =
    card;
  const avatarColor = avatarColorFor(id);
  const visibleSpecialties = specialties.slice(0, MAX_VISIBLE_SPECIALTIES);

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow)] transition-all duration-150 hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span
              className={`grid h-full w-full place-items-center text-base font-bold ${avatarColor.bg} ${avatarColor.text}`}
            >
              {initials(fullName)}
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-col">
          <h3 className="truncate font-display text-base font-bold text-text">{fullName}</h3>
          {/* Título profesional es lo relevante para un visitante evaluando a quién contactar —
              queda más prominente que el workspace (ver feedback QA ago 2026). */}
          {jobTitle && <p className="truncate text-sm font-semibold text-text">{jobTitle}</p>}
          <p className="truncate text-xs text-muted">{organizationName}</p>
        </div>
      </div>

      {(location || yearsOfExperience != null) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {location && (
            <span className="inline-flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {location}
            </span>
          )}
          {yearsOfExperience != null && (
            <span className="inline-flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 7h-9m9 5h-9m9 5h-9M4 7h.01M4 12h.01M4 17h.01" />
              </svg>
              +{yearsOfExperience} años de experiencia
            </span>
          )}
        </div>
      )}

      {bio && <p className="text-sm leading-relaxed text-text/80">{truncateBio(bio)}</p>}

      {visibleSpecialties.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {visibleSpecialties.map((s) => (
            <Badge key={s} variant="primary">
              {s}
            </Badge>
          ))}
        </div>
      )}

      <Link
        href={`/community/${id}`}
        className={`mt-auto flex items-center justify-center gap-2 rounded-[var(--radius)] border border-border py-2 text-xs font-semibold text-text transition-colors hover:border-primary hover:text-primary ${focusRing}`}
      >
        Ver perfil
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12h14m-6-6 6 6-6 6" />
        </svg>
      </Link>
    </div>
  );
}
