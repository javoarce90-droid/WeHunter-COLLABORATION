import { type TextareaHTMLAttributes, forwardRef, useId } from "react";
import { fieldClasses, fieldLabelClass } from "./input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

/** Textarea del sistema. Mismo look/label/error que Input (reusa `fieldClasses`). */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", ...props }, ref) => {
    const id = useId();
    const textareaId = props.id ?? id;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={textareaId} className={fieldLabelClass}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={[fieldClasses(!!error), className].join(" ")}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
