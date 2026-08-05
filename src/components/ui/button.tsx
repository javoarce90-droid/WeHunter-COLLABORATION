import { type ButtonHTMLAttributes, forwardRef } from "react";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "default" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover disabled:opacity-50",
  secondary:
    "border border-border bg-surface text-text hover:bg-bg disabled:opacity-50",
  ghost:
    "bg-transparent text-muted border border-border hover:bg-bg hover:text-text disabled:opacity-50",
  destructive:
    "bg-danger text-white hover:opacity-90 disabled:opacity-50 focus-visible:ring-[var(--focus-ring-danger)]",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "px-4 py-3 text-sm",
  sm: "px-3 py-2 text-xs",
};

export function buttonVariants({
  variant = "primary",
  size = "default",
  className = "",
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return [
    "relative inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-semibold",
    "outline-none transition-[transform,color,background-color,border-color,box-shadow] duration-150 ease-out",
    "focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] active:scale-[0.98]",
    variantClasses[variant],
    sizeClasses[size],
    className,
  ].join(" ");
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "default",
      loading = false,
      className = "",
      children,
      disabled,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      className={buttonVariants({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </span>
      )}
      <span className={loading ? "contents invisible" : "contents"}>
        {children}
      </span>
    </button>
  ),
);

Button.displayName = "Button";
