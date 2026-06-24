import { type InputHTMLAttributes, forwardRef } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

/**
 * Checkbox del sistema. `accent-primary` usa el control nativo teñido (no reinventamos
 * el control — guía product: no inventar affordances estándar). Foco visible.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className = "", ...props }, ref) => {
    const input = (
      <input
        ref={ref}
        type="checkbox"
        className={[
          "h-4 w-4 shrink-0 cursor-pointer rounded border-border accent-primary",
          "outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        ].join(" ")}
        {...props}
      />
    );
    if (!label) return input;
    return (
      <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-text">
        {input}
        {label}
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";
