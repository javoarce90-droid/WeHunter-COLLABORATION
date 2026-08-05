"use client";

import { type InputHTMLAttributes, forwardRef, useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { IconButton } from "./icon-button";

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
    "w-full rounded-[var(--radius)] border bg-bg px-3 py-3 text-sm text-text outline-none transition-colors",
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
  ({ label, error, className = "", type, ...props }, ref) => {
    const id = useId();
    const inputId = props.id ?? id;
    const [visible, setVisible] = useState(false);
    const isPassword = type === "password";

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className={fieldLabelClass}>
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={isPassword ? (visible ? "text" : "password") : type}
            className={[
              fieldClasses(!!error),
              isPassword ? "pr-10" : "",
              className,
            ].join(" ")}
            {...props}
          />
          {isPassword && (
            <IconButton
              type="button"
              size="sm"
              variant="ghost"
              disabled={props.disabled}
              aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={visible}
              onClick={() => setVisible((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              {visible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </IconButton>
          )}
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  },
);

Input.displayName = "Input";
