import type { ReactNode } from "react";

/** Card de sección compartida por todas las tabs de Configuración. */
export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow)]">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-bold text-text">{title}</h2>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}
