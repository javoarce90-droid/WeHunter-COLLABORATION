type AvatarSize = "sm" | "md" | "lg";

const sizeClasses: Record<AvatarSize, string> = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
};

/** Iniciales de un nombre (hasta 2). "Ana Pérez" → "AP". */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "··";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface AvatarProps {
  name: string;
  size?: AvatarSize;
  className?: string;
}

/**
 * Avatar de iniciales. Tinte púrpura suave sobre fondo claro (no decorativo: identifica
 * a la persona de un vistazo en listas densas). Generaliza el patrón inline del Sidebar.
 */
export function Avatar({ name, size = "md", className = "" }: AvatarProps) {
  return (
    <span
      aria-hidden
      className={[
        "grid shrink-0 place-items-center rounded-full bg-primary-light font-bold text-primary-hover",
        sizeClasses[size],
        className,
      ].join(" ")}
    >
      {initialsOf(name)}
    </span>
  );
}
