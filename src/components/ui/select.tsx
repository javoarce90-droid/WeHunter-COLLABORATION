import { type SelectHTMLAttributes, forwardRef, useId } from "react";
import { fieldClasses, fieldLabelClass } from "./input";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

/** Select del sistema. Mismo look/label/error que Input (reusa `fieldClasses`). */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className = "", children, ...props }, ref) => {
    const id = useId();
    const selectId = props.id ?? id;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={selectId} className={fieldLabelClass}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={[fieldClasses(!!error), className].join(" ")}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  },
);

Select.displayName = "Select";
