import { type InputHTMLAttributes, forwardRef, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    const id = useId();
    const inputId = props.id ?? id;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-muted"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            "w-full rounded-[var(--radius)] border border-border bg-surface px-3 py-2.5 text-sm outline-none transition-colors",
            "focus:border-primary focus:ring-2 focus:ring-[rgba(123,47,219,0.2)]",
            error ? "border-danger focus:border-danger focus:ring-[rgba(220,38,38,0.2)]" : "",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className,
          ].join(" ")}
          {...props}
        />
        {error && (
          <p className="text-xs text-danger">{error}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
