"use client";

const linkClass =
  "rounded-[var(--radius)] border border-border px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:border-primary hover:text-primary";

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const encodedUrl = encodeURIComponent(url);
  const text = encodeURIComponent(title);

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={`https://wa.me/?text=${text}%20${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        WhatsApp
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        LinkedIn
      </a>
      <a href={`mailto:?subject=${text}&body=${encodedUrl}`} className={linkClass}>
        Email
      </a>
    </div>
  );
}
