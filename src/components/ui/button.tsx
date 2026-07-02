import { type ButtonHTMLAttributes, forwardRef } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "default" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-hover disabled:opacity-50",
  secondary:
    "border border-border bg-surface text-text hover:bg-bg disabled:opacity-50",
  ghost:
    "bg-transparent text-muted border border-border hover:bg-bg hover:text-text disabled:opacity-50",
  destructive:
    "bg-danger text-white hover:opacity-90 disabled:opacity-50",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "px-4 py-2.5 text-sm",
  sm: "px-2.5 py-1.5 text-xs",
};

export function buttonVariants({
  variant = "primary",
  size = "default",
  className = "",
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return [
    "inline-flex items-center justify-center gap-1.5 rounded-[var(--radius)] font-semibold transition-colors",
    variantClasses[variant],
    sizeClasses[size],
    className,
  ].join(" ");
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "default", className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  ),
);

Button.displayName = "Button";
