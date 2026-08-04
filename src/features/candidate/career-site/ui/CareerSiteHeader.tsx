import ReactMarkdown from "react-markdown";
import type { CareerSiteOrg } from "../data/career-site.data";

/** Sin plugin de tipografía de Tailwind en el proyecto — se estilan los elementos a mano,
 *  mismo criterio visual que ya usa `JobMarkdown` para el aviso de la búsqueda. */
const DESCRIPTION_MARKDOWN_COMPONENTS = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="text-sm leading-relaxed text-text/80">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-text">{children}</strong>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
      {children}
    </a>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc space-y-1 pl-5 text-sm text-text/80">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal space-y-1 pl-5 text-sm text-text/80">{children}</ol>
  ),
};

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

  const logo = org.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={org.logoUrl} alt="" className="h-full w-full rounded-[var(--radius)] object-cover" />
  ) : (
    <span className="grid h-full w-full place-items-center rounded-[var(--radius)] bg-primary-light text-lg font-bold text-primary-hover">
      {org.name.slice(0, 2).toUpperCase()}
    </span>
  );

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto max-w-3xl px-4">
        {org.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={org.coverUrl}
            alt=""
            className="mt-6 h-40 w-full rounded-[var(--radius)] object-cover sm:h-56"
          />
        )}
        <div
          className={
            org.coverUrl
              ? "-mt-10 flex items-end gap-4 sm:-mt-12"
              : "flex items-center gap-4 pt-6"
          }
        >
          <div
            className={
              org.coverUrl
                ? "h-20 w-20 shrink-0 rounded-[calc(var(--radius)+4px)] bg-surface p-1 shadow-[var(--shadow)] sm:h-24 sm:w-24"
                : "h-14 w-14 shrink-0"
            }
          >
            {logo}
          </div>
          <div className={`flex flex-col gap-0.5 ${org.coverUrl ? "pb-1" : ""}`}>
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

        <div className="flex flex-col gap-3 py-6">
          {org.settings?.description && (
            <div className="flex max-w-[70ch] flex-col gap-2">
              <ReactMarkdown components={DESCRIPTION_MARKDOWN_COMPONENTS}>
                {org.settings.description}
              </ReactMarkdown>
            </div>
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
      </div>
    </header>
  );
}
