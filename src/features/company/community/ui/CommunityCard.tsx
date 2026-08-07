import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
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

export function CommunityCard({ card }: { card: CommunityCardData }) {
  const { id, fullName, avatarUrl, jobTitle, bio, linkedinUrl, organizationName, careerSiteHref, whatsappHref } =
    card;
  const avatarColor = avatarColorFor(id);
  const hasContact = Boolean(linkedinUrl || whatsappHref);

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
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="truncate font-display text-base font-bold text-text">{fullName}</h3>
          {jobTitle && <p className="truncate text-sm text-muted">{jobTitle}</p>}
          <p className="truncate text-sm">
            {careerSiteHref ? (
              <Link
                href={careerSiteHref}
                className={`font-semibold text-primary hover:underline ${focusRing}`}
              >
                {organizationName}
              </Link>
            ) : (
              <span className="font-semibold text-text">{organizationName}</span>
            )}
          </p>
        </div>
      </div>

      <p className={bio ? "line-clamp-3 text-sm leading-relaxed text-text/80" : "text-sm italic text-muted"}>
        {bio || "Todavía no cargó una biografía."}
      </p>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
        {hasContact ? (
          <>
            {linkedinUrl ? (
              <a
                href={linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-xs font-semibold text-muted transition-colors hover:text-primary ${focusRing}`}
              >
                LinkedIn
              </a>
            ) : (
              <span />
            )}
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "primary", size: "sm" })}
              >
                WhatsApp
              </a>
            )}
          </>
        ) : (
          <p className="text-xs italic text-muted">Todavía no cargó datos de contacto.</p>
        )}
      </div>
    </div>
  );
}
