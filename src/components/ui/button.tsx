import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "default" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-hover disabled:opacity-50",
  secondary:
    "border border-border bg-surface text-text hover:bg-bg disabled:opacity-50",
  ghost:
    "bg-transparent text-muted border border-border hover:bg-bg hover:text-text disabled:opacity-50",
  destructive:
    "bg-danger text-white hover:opacity-90 disabled:opacity-50",
};

const sizeClasses: Record<Size, string> = {
  default: "px-4 py-2.5 text-sm",
  sm: "px-2.5 py-1.5 text-xs",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "default", className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={[
        "inline-flex items-center justify-center gap-1.5 rounded-[var(--radius)] font-semibold transition-colors",
        variantClasses[variant],
        sizeClasses[size],
        className,
      ].join(" ")}
      {...props}
    />
  ),
);

Button.displayName = "Button";
