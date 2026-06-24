import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "ghost" | "surface";
type Size = "sm" | "md";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Obligatorio: botón de solo ícono necesita nombre accesible. */
  "aria-label": string;
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  ghost: "text-muted hover:bg-bg hover:text-text",
  surface: "border border-border bg-surface text-muted hover:border-primary hover:text-primary",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
};

/** Botón de solo ícono. Target ≥28–36px; foco visible; aria-label requerido por tipos. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = "ghost", size = "md", className = "", ...props }, ref) => (
    <button
      ref={ref}
      type={props.type ?? "button"}
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-lg transition-colors",
        "outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
      {...props}
    />
  ),
);

IconButton.displayName = "IconButton";
