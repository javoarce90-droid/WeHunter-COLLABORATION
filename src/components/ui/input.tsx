import { type InputHTMLAttributes, forwardRef, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/**
 * Clases base compartidas por los controles de formulario (Input, Select, Textarea). Única
 * fuente de verdad del look de campo: fondo `bg-bg` (contrasta con la card `bg-surface`),
 * borde, foco y estado de error. Reusar esto en vez de replicar las clases a mano.
 */
export function fieldClasses(hasError = false): string {
  return [
    "w-full rounded-[var(--radius)] border bg-bg px-3 py-2.5 text-sm text-text outline-none transition-colors",
    "focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)]",
    hasError
      ? "border-danger focus:border-danger focus:ring-[var(--focus-ring-danger)]"
      : "border-border",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ].join(" ");
}

/** Label compartido de los controles de formulario. */
export const fieldLabelClass = "text-xs font-semibold text-muted";

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    const id = useId();
    const inputId = props.id ?? id;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className={fieldLabelClass}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[fieldClasses(!!error), className].join(" ")}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";
