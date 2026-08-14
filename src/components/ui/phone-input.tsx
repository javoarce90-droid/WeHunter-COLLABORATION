"use client";

import PhoneInputPrimitive from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { fieldLabelClass } from "./input";

interface PhoneInputProps {
  name: string;
  label?: string;
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
}

/**
 * Selector de país + código de área + número, con validación real (usa libphonenumber-js
 * vía react-phone-number-input). El valor circula en formato E.164 (+549...) — mismo formato
 * que usan los links wa.me, así que no hace falta reformatear en ningún lado que lo consuma.
 */
export function PhoneInput({ name, label, value, onChange, placeholder }: PhoneInputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className={fieldLabelClass}>{label}</label>}
      <PhoneInputPrimitive
        international
        defaultCountry="AR"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        numberInputProps={{
          className:
            "min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-text outline-none placeholder:text-muted",
        }}
        className={[
          "flex items-center gap-2 rounded-[var(--radius)] border border-border bg-bg px-3 py-3 transition-colors",
          "focus-within:border-primary focus-within:ring-2 focus-within:ring-[var(--focus-ring)]",
          "[&_.PhoneInputCountry]:shrink-0 [&_.PhoneInputCountrySelect]:bg-transparent",
        ].join(" ")}
      />
      <input type="hidden" name={name} value={value ?? ""} />
    </div>
  );
}
