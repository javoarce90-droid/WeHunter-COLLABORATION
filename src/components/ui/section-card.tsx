import type { ReactNode } from "react";

interface SectionCardProps {
  /** Título del panel (string, o nodo si lleva ícono). */
  title: ReactNode;
  /** Afordancia a la derecha del header: link "Ver →", contador, botón de IA, badge, etc. */
  action?: ReactNode;
  children: ReactNode;
  /** Clases extra sobre el `<section>`. */
  className?: string;
  /** Clases extra sobre el cuerpo (ej. "flex flex-col gap-4"). */
  bodyClassName?: string;
}

/**
 * Panel de sección del sistema: card con header bordeado (título + acción opcional) y cuerpo.
 * Única fuente de verdad del patrón — reemplaza los paneles armados a mano que convivían con
 * dos estilos distintos (header bordeado en el resumen vs header inline en rendimiento).
 */
export function SectionCard({
  title,
  action,
  children,
  className = "",
  bodyClassName = "",
}: SectionCardProps) {
  return (
    <section
      className={[
        "rounded-[var(--radius)] border border-border bg-surface shadow-[var(--shadow)]",
        className,
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-text">{title}</h2>
        {action}
      </div>
      <div className={["px-5 py-4", bodyClassName].join(" ")}>{children}</div>
    </section>
  );
}
