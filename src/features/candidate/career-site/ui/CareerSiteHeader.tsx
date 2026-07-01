import type { CareerSiteOrg } from "../data/career-site.data";

const SOCIAL_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  x: "X",
  facebook: "Facebook",
};

export function CareerSiteHeader({ org }: { org: CareerSiteOrg }) {
  const social = org.settings?.social ?? {};
  const links = (Object.keys(SOCIAL_LABELS) as (keyof typeof SOCIAL_LABELS)[])
    .map((key) => ({ key, label: SOCIAL_LABELS[key], url: social[key as keyof typeof social] }))
    .filter((l): l is { key: string; label: string; url: string } => !!l.url);

  return (
    <header className="border-b border-border bg-surface">
      {org.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={org.coverUrl} alt="" className="h-40 w-full object-cover sm:h-56" />
      )}
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-6">
        <div className="flex items-center gap-4">
          {org.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={org.logoUrl}
              alt=""
              className="h-14 w-14 shrink-0 rounded-[var(--radius)] object-cover"
            />
          ) : (
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[var(--radius)] bg-primary-light text-lg font-bold text-primary-hover">
              {org.name.slice(0, 2).toUpperCase()}
            </span>
          )}
          <div className="flex flex-col gap-0.5">
            <h1 className="font-display text-xl font-bold text-text">{org.name}</h1>
            {org.settings?.website && (
              <a
                href={org.settings.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-primary hover:underline"
              >
                {org.settings.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>
        </div>

        {org.settings?.description && (
          <p className="max-w-[70ch] text-sm leading-relaxed text-text/80">
            {org.settings.description}
          </p>
        )}

        {links.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {links.map((l) => (
              <a
                key={l.key}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-muted hover:text-primary"
              >
                {l.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
