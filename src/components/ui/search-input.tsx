"use client";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Texto accesible del campo. */
  "aria-label": string;
  className?: string;
}

/**
 * Campo de búsqueda controlado para filtrado instantáneo de listados (client-side, sin
 * round-trip → velocidad percibida). Ícono de lupa y botón de limpiar cuando hay texto.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar…",
  className = "",
  ...rest
}: SearchInputProps) {
  return (
    <div className={["relative inline-flex w-full max-w-xs items-center", className].join(" ")}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="pointer-events-none absolute left-3 text-muted"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={rest["aria-label"]}
        className="w-full rounded-[var(--radius)] border border-border bg-surface py-2 pl-9 pr-8 text-sm text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--focus-ring)] [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpiar búsqueda"
          className="absolute right-2 grid h-6 w-6 place-items-center rounded-md text-muted transition-colors hover:bg-bg hover:text-text"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="m4 4 8 8M12 4l-8 8" />
          </svg>
        </button>
      )}
    </div>
  );
}
